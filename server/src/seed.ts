import { pool } from './db';
import { hashPassword } from './auth';
import { audit } from './audit';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const HELENA_ID = '22222222-2222-4222-8222-222222222222';
const RAFAEL_ID = '33333333-3333-4333-8333-333333333333';
const CAMILA_ID = '44444444-4444-4444-8444-444444444444';
const BRUNO_ID = '55555555-5555-4555-8555-555555555555';
const JULIANA_ID = '66666666-6666-4666-8666-666666666666';
const TIAGO_ID = '77777777-7777-4777-8777-777777777777';

const SECTORS = [
  { id: 'a0000000-0000-4000-8000-000000000001', key: 'louvor', name: 'Louvor', description: 'Equipe de música e condução dos cultos.' },
  { id: 'a0000000-0000-4000-8000-000000000002', key: 'midia', name: 'Mídia', description: 'Gravação, edição, transmissão e publicação.' },
  { id: 'a0000000-0000-4000-8000-000000000003', key: 'producao', name: 'Produção', description: 'Produção de eventos e operação de palco.' },
  { id: 'a0000000-0000-4000-8000-000000000004', key: 'tecnica', name: 'Técnica', description: 'Áudio, vídeo, iluminação e infraestrutura.' },
  { id: 'a0000000-0000-4000-8000-000000000005', key: 'acolhimento', name: 'Acolhimento', description: 'Recepção e suporte às pessoas.' },
];

const S = {
  louvor: SECTORS[0].id,
  midia: SECTORS[1].id,
  producao: SECTORS[2].id,
  tecnica: SECTORS[3].id,
  acolhimento: SECTORS[4].id,
};

const USERS = [
  { id: ADMIN_ID, name: 'Davi Gomes', username: 'davi.gomes', email: 'davi@mmvconnect.app', roles: ['sysadmin'], sectors: [{ id: S.producao, lead: true }] },
  { id: HELENA_ID, name: 'Helena Duarte', username: 'helena.duarte', email: 'helena@mmvconnect.app', roles: ['senior_lead'], sectors: [{ id: S.producao, lead: true }] },
  { id: RAFAEL_ID, name: 'Rafael Prado', username: 'rafael.prado', email: 'rafael@mmvconnect.app', roles: ['studio_lead'], sectors: [{ id: S.louvor, lead: true }] },
  { id: CAMILA_ID, name: 'Camila Ferreira', username: 'camila.ferreira', email: 'camila@mmvconnect.app', roles: ['sector_lead'], sectors: [{ id: S.midia, lead: true }] },
  { id: BRUNO_ID, name: 'Bruno Alves', username: 'bruno.alves', email: 'bruno@mmvconnect.app', roles: ['member'], sectors: [{ id: S.midia, lead: false }, { id: S.tecnica, lead: false }] },
  { id: JULIANA_ID, name: 'Juliana Reis', username: 'juliana.reis', email: 'juliana@mmvconnect.app', roles: ['member'], sectors: [{ id: S.acolhimento, lead: false }, { id: S.producao, lead: false }] },
  { id: TIAGO_ID, name: 'Tiago Moraes', username: 'tiago.moraes', email: 'tiago@mmvconnect.app', roles: ['member'], sectors: [{ id: S.tecnica, lead: false }] },
];

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'MMVconnect#2026';

function at(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function main() {
  const client = await pool.connect();
  try {
    // As guardas de banco exigem um contexto de ator para operações sensíveis.
    await client.query(
      `select set_config('mmv.actor_id', '00000000-0000-4000-8000-000000000000', false),
              set_config('mmv.actor_level', '9', false)`,
    );

    const { rows: existing } = await client.query('select count(*)::int as total from users');
    if (existing[0].total > 0) {
      console.log('base já possui dados — seed ignorado.');
      return;
    }

    // ---------------------------------------------------------------
    // Estrutura global
    // ---------------------------------------------------------------
    for (const sector of SECTORS) {
      await client.query(
        `insert into sectors (id, key, name, description) values ($1, $2, $3, $4)
         on conflict (id) do nothing`,
        [sector.id, sector.key, sector.name, sector.description],
      );
    }

    await client.query(
      `insert into modules
         (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
       values
         ('studio', 'Gestão do Estúdio',
          'Operação completa do estúdio: eventos, checklists, relatórios, qualidade, escalas e acervo de mídia.',
          'AudioLines', '#3B4FA0', '/m/studio', true, 10,
          array['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[],
          '{"product_name": "Estúdio 40", "accent": "indigo"}'::jsonb),
         ('production', 'Produção',
          'Produção de eventos, estrutura de palco e logística operacional.',
          'Clapperboard', '#12796B', '/m/production', false, 20,
          array['studio_lead','senior_lead','sysadmin']::user_role[],
          '{"product_name": "Produção"}'::jsonb)
       on conflict (key) do nothing`,
    );

    for (const user of USERS) {
      await client.query(
        `insert into users (id, full_name, username, email, password_hash, status)
         values ($1, $2, $3, $4, $5, 'active') on conflict (id) do nothing`,
        [user.id, user.name, user.username, user.email, hashPassword(DEMO_PASSWORD)],
      );
      for (const role of user.roles) {
        await client.query(
          `insert into user_roles (user_id, role) values ($1, $2::user_role)
           on conflict do nothing`,
          [user.id, role],
        );
      }
      for (const sector of user.sectors) {
        await client.query(
          `insert into user_sectors (user_id, sector_id, is_lead) values ($1, $2, $3)
           on conflict do nothing`,
          [user.id, sector.id, sector.lead],
        );
      }
    }

    const optionSettings = [
      ['event_types', ['Culto', 'Ensaio', 'Gravação', 'Transmissão', 'Reunião', 'Treinamento'], 'Tipos de evento', 'Opções usadas no cadastro de eventos.'],
      ['error_categories', ['Técnica', 'Operacional', 'Comunicação', 'Conteúdo', 'Infraestrutura', 'Pessoas'], 'Categorias de erro', 'Classificação dos erros operacionais.'],
      ['occurrence_types', ['Atraso', 'Ausência', 'Conduta', 'Não cumprimento de escala', 'Dano material', 'Reconhecimento'], 'Tipos de ocorrência', 'Opções usadas nos registros de ocorrência.'],
      ['media_platforms', ['YouTube', 'Instagram', 'Facebook', 'Site', 'Spotify'], 'Plataformas de publicação', 'Destinos possíveis do acervo de mídia.'],
      ['record_types', ['Gravação', 'Transmissão', 'Gravação e transmissão'], 'Tipos de registro', 'Formato do conteúdo audiovisual.'],
      ['report_sections', ['Abertura', 'Execução do evento', 'Ocorrências', 'Avaliação da equipe', 'Conclusão'], 'Seções do relatório', 'Estrutura padrão dos relatórios de evento.'],
    ];

    for (const [key, value, label, description] of optionSettings) {
      await client.query(
        `insert into settings (key, value, label, description, category)
         values ($1, $2::jsonb, $3, $4, 'options') on conflict (key) do nothing`,
        [key, JSON.stringify(value), label, description],
      );
    }

    await client.query(
      `insert into settings (key, value, label, description, category)
       values ('platform_notice',
               '{"title": "Bem-vindo ao MMV Connect", "body": "Central única de aplicativos da operação."}'::jsonb,
               'Aviso da central', 'Mensagem exibida na central de aplicativos.', 'general')
       on conflict (key) do nothing`,
    );

    // ---------------------------------------------------------------
    // Eventos
    // ---------------------------------------------------------------
    const events = [
      { id: 'b0000000-0000-4000-8000-000000000001', name: 'Culto da Manhã', type: 'Culto', starts: at(-4, 9, 0), ends: at(-4, 11, 0), status: 'completed' },
      { id: 'b0000000-0000-4000-8000-000000000002', name: 'Culto da Noite', type: 'Culto', starts: at(-4, 18, 30), ends: at(-4, 20, 30), status: 'completed' },
      { id: 'b0000000-0000-4000-8000-000000000003', name: 'Ensaio Geral', type: 'Ensaio', starts: at(-7, 19, 30), ends: at(-7, 21, 30), status: 'completed' },
      { id: 'b0000000-0000-4000-8000-000000000004', name: 'Culto da Manhã', type: 'Culto', starts: at(3, 9, 0), ends: at(3, 11, 0), status: 'scheduled' },
      { id: 'b0000000-0000-4000-8000-000000000005', name: 'Culto da Noite', type: 'Culto', starts: at(3, 18, 30), ends: at(3, 20, 30), status: 'scheduled' },
      { id: 'b0000000-0000-4000-8000-000000000006', name: 'Ensaio de Louvor', type: 'Ensaio', starts: at(5, 19, 30), ends: at(5, 21, 0), status: 'scheduled' },
      { id: 'b0000000-0000-4000-8000-000000000007', name: 'Santa Ceia', type: 'Culto', starts: at(10, 9, 0), ends: at(10, 11, 0), status: 'scheduled' },
      { id: 'b0000000-0000-4000-8000-000000000008', name: 'Transmissão Especial — Aniversário', type: 'Transmissão', starts: at(-11, 19, 0), ends: at(-11, 21, 0), status: 'cancelled' },
    ];

    for (const event of events) {
      await client.query(
        `insert into events (id, name, type, starts_at, ends_at, status, created_by, notes)
         values ($1, $2, $3, $4, $5, $6::event_status, $7, $8) on conflict (id) do nothing`,
        [
          event.id,
          event.name,
          event.type,
          event.starts,
          event.ends,
          event.status,
          RAFAEL_ID,
          event.status === 'cancelled' ? 'Cancelado por conflito de agenda do espaço.' : null,
        ],
      );
    }

    const presets = [
      ['Culto da Manhã', 'Culto', 0, '09:00', '11:00', 'Abertura do estúdio às 07:30.'],
      ['Culto da Noite', 'Culto', 0, '18:30', '20:30', 'Abertura do estúdio às 17:00.'],
      ['Ensaio de Louvor', 'Ensaio', 3, '19:30', '21:00', 'Ensaio semanal da equipe de louvor.'],
      ['Reunião de Liderança', 'Reunião', 1, '20:00', '21:30', null],
    ];
    for (const [name, type, weekday, start, end, notes] of presets) {
      await client.query(
        `insert into event_presets (name, type, weekday, start_time, end_time, notes)
         values ($1, $2, $3, $4, $5, $6)`,
        [name, type, weekday, start, end, notes],
      );
    }

    // ---------------------------------------------------------------
    // Checklists
    // ---------------------------------------------------------------
    const templateOpening = 'c0000000-0000-4000-8000-000000000001';
    const templateClosing = 'c0000000-0000-4000-8000-000000000002';

    await client.query(
      `insert into checklist_templates (id, name, description, sector_id, active)
       values
         ($1, 'Abertura do estúdio', 'Conferência inicial antes da abertura dos portões.', $3, true),
         ($2, 'Encerramento e conferência', 'Fechamento do estúdio ao final do evento.', $3, true)
       on conflict (id) do nothing`,
      [templateOpening, templateClosing, S.tecnica],
    );

    const openingItems = [
      ['Ligar mesa de som e console de vídeo', 'Verificar energia e inicialização dos equipamentos.'],
      ['Testar todos os microfones', 'Conferir pilhas, cabos e canais no console.'],
      ['Validar transmissão', 'Checar internet, encoder e prévia no YouTube.'],
      ['Conferir iluminação de palco', 'Validar presets de luz e refletores.'],
      ['Liberar acesso da equipe', 'Conferir crachás e escalas do dia.'],
    ];
    for (let i = 0; i < openingItems.length; i += 1) {
      await client.query(
        `insert into checklist_template_items (template_id, title, description, sort_order)
         values ($1, $2, $3, $4)`,
        [templateOpening, openingItems[i][0], openingItems[i][1], i],
      );
    }
    const closingItems = [
      ['Desligar equipamentos', 'Sequência: console, mesa de som, amplificadores.'],
      ['Guardar microfones e cabos', 'Conferir contagem no armário.'],
      ['Gerar backup das gravações', 'Copiar cartões e enviar para o acervo.'],
    ];
    for (let i = 0; i < closingItems.length; i += 1) {
      await client.query(
        `insert into checklist_template_items (template_id, title, description, sort_order)
         values ($1, $2, $3, $4)`,
        [templateClosing, closingItems[i][0], closingItems[i][1], i],
      );
    }

    const runPast = 'd0000000-0000-4000-8000-000000000001';
    await client.query(
      `insert into checklist_runs (id, event_id, template_id, name, status, created_by)
       values ($1, $2, $3, 'Abertura — Culto da Manhã', 'completed', $4)
       on conflict (id) do nothing`,
      [runPast, events[0].id, templateOpening, RAFAEL_ID],
    );

    const runUpcoming = 'd0000000-0000-4000-8000-000000000002';
    await client.query(
      `insert into checklist_runs (id, event_id, template_id, name, status, created_by)
       values ($1, $2, $3, 'Abertura — Próximo culto da manhã', 'open', $4)
       on conflict (id) do nothing`,
      [runUpcoming, events[3].id, templateOpening, RAFAEL_ID],
    );

    const pastTasks = [
      ['Ligar mesa de som e console de vídeo', 'done', TIAGO_ID, null],
      ['Testar todos os microfones', 'done', TIAGO_ID, null],
      ['Validar transmissão', 'blocked', BRUNO_ID, 'Internet oscilou durante o teste inicial.'],
      ['Conferir iluminação de palco', 'done', TIAGO_ID, null],
      ['Liberar acesso da equipe', 'pending', JULIANA_ID, null],
    ];
    for (let i = 0; i < pastTasks.length; i += 1) {
      const [title, status, assignee, blockReason] = pastTasks[i];
      const { rows } = await client.query(
        `insert into checklist_tasks
           (run_id, sector_id, assignee_id, title, description, status, block_reason,
            sort_order, completed_at, completed_by)
         values ($1, $2, $3, $4, $5, $6::task_status, $7, $8,
                 case when $6 = 'done' then now() - interval '5 days' else null end,
                 case when $6 = 'done' then $3::uuid else null end)
         returning id`,
        [runPast, S.tecnica, assignee, title, openingItems[i][1], status, blockReason, i],
      );
      await client.query(
        `insert into checklist_task_history (task_id, action, from_status, to_status, user_id, notes, created_at)
         values ($1, 'task.created', null, 'pending', $2, 'Tarefa criada a partir do modelo.', now() - interval '5 days')`,
        [rows[0].id, RAFAEL_ID],
      );
      if (status !== 'pending') {
        await client.query(
          `insert into checklist_task_history (task_id, action, from_status, to_status, user_id, notes, created_at)
           values ($1, $2, 'pending', $3::task_status, $4, $5, now() - interval '5 days')`,
          [
            rows[0].id,
            status === 'done' ? 'task.completed' : 'task.blocked',
            status,
            assignee,
            status === 'blocked' ? blockReason : 'Conferido antes da abertura.',
          ],
        );
      }
    }

    const upcomingAssignees = [TIAGO_ID, BRUNO_ID, TIAGO_ID, JULIANA_ID, CAMILA_ID];
    for (let i = 0; i < openingItems.length; i += 1) {
      const { rows } = await client.query(
        `insert into checklist_tasks (run_id, sector_id, assignee_id, title, description, sort_order)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [runUpcoming, S.tecnica, upcomingAssignees[i], openingItems[i][0], openingItems[i][1], i],
      );
      await client.query(
        `insert into checklist_task_history (task_id, action, to_status, user_id, notes)
         values ($1, 'task.created', 'pending', $2, 'Tarefa criada a partir do modelo.')`,
        [rows[0].id, RAFAEL_ID],
      );
    }

    // ---------------------------------------------------------------
    // Relatórios
    // ---------------------------------------------------------------
    const reportFinal = 'e0000000-0000-4000-8000-000000000001';
    const reportReview = 'e0000000-0000-4000-8000-000000000002';
    const reportDraft = 'e0000000-0000-4000-8000-000000000003';

    const reports = [
      { id: reportFinal, eventId: events[0].id, title: 'Relatório — Culto da Manhã', status: 'finalized', author: RAFAEL_ID },
      { id: reportReview, eventId: events[2].id, title: 'Relatório — Ensaio Geral', status: 'in_review', author: RAFAEL_ID },
      { id: reportDraft, eventId: events[1].id, title: 'Relatório — Culto da Noite', status: 'draft', author: CAMILA_ID },
    ];

    for (const report of reports) {
      await client.query(
        `insert into event_reports
           (id, event_id, title, status, created_by, reviewer_id, reviewed_at, finalized_by, finalized_at)
         values ($1, $2, $3, $4::report_status, $5,
                 case when $4 = 'finalized' then $6::uuid else null end,
                 case when $4 in ('finalized') then now() - interval '3 days' else null end,
                 case when $4 = 'finalized' then $6::uuid else null end,
                 case when $4 = 'finalized' then now() - interval '3 days' else null end)
         on conflict (id) do nothing`,
        [report.id, report.eventId, report.title, report.status, report.author, HELENA_ID],
      );

      const sectionTitles = ['Abertura', 'Execução do evento', 'Ocorrências', 'Avaliação da equipe', 'Conclusão'];
      for (let i = 0; i < sectionTitles.length; i += 1) {
        const filled = report.status !== 'draft' && i < 4;
        const content = filled
          ? [
              'Abertura realizada às 07:30, equipe completa e equipamentos conferidos.',
              'Execução dentro do planejado, com pequena oscilação na transmissão no primeiro bloco.',
              'Microfone sem fio apresentou falha intermitente; erro operacional registrado.',
              'Equipe respondeu bem ao imprevisto. Recomendado teste adicional de bateria antes da abertura.',
              'Evento concluído sem impactos ao público presente.',
            ][i]
          : null;
        await client.query(
          `insert into report_sections
             (report_id, title, content, author_id, not_applicable, sort_order, updated_at)
           values ($1, $2, $3, $4, $5, $6,
                   case when $3::text is not null then now() - interval '4 days' else now() end)`,
          [report.id, sectionTitles[i], content, content ? report.author : null, i === 4 && report.status !== 'finalized', i],
        );
      }

      if (report.status !== 'draft') {
        await client.query(
          `insert into report_history (report_id, user_id, action, from_status, to_status, notes, created_at)
           values ($1, $2, 'report.submitted', 'draft', 'in_review', 'Conteúdo preenchido e enviado para revisão.', now() - interval '4 days')`,
          [report.id, report.author],
        );
      }
      if (report.status === 'finalized') {
        await client.query(
          `insert into report_history (report_id, user_id, action, from_status, to_status, notes, created_at)
           values ($1, $2, 'report.finalized', 'in_review', 'finalized', 'Revisão aprovada.', now() - interval '3 days')`,
          [report.id, HELENA_ID],
        );
      }
    }

    // ---------------------------------------------------------------
    // Problemas / soluções / autorizações
    // ---------------------------------------------------------------
    const problem1 = 'f0000000-0000-4000-8000-000000000001';
    const problem2 = 'f0000000-0000-4000-8000-000000000002';
    const problem3 = 'f0000000-0000-4000-8000-000000000003';

    const problems = [
      {
        id: problem1,
        code: 'PRB-0001',
        title: 'Falha intermitente no microfone sem fio',
        description: 'O microfone sem fio 3 apresenta quedas de sinal durante os cultos da manhã. A falha ocorreu nos dois últimos eventos.',
        status: 'awaiting_authorization',
        sector: S.tecnica,
        event: events[0].id,
        category: 'Equipamento',
        impact: 'Perda de áudio em momentos de fala.',
        urgency: 'high',
        priority: 'high',
        owner: TIAGO_ID,
        identifiedBy: CAMILA_ID,
        due: at(14, 12, 0).slice(0, 10),
      },
      {
        id: problem2,
        code: 'PRB-0002',
        title: 'Atraso na entrega da edição de mídia',
        description: 'Conteúdos publicados com atraso superior a 48 horas em duas semanas consecutivas.',
        status: 'in_analysis',
        sector: S.midia,
        event: events[1].id,
        category: 'Processo',
        impact: 'Redução de alcance e engajamento.',
        urgency: 'medium',
        priority: 'medium',
        owner: CAMILA_ID,
        identifiedBy: HELENA_ID,
        due: at(21, 12, 0).slice(0, 10),
      },
      {
        id: problem3,
        code: 'PRB-0003',
        title: 'Cabo de rede danificado no rack principal',
        description: 'Cabo de rede do encoder apresentou dano físico e causou queda de transmissão.',
        status: 'resolved',
        sector: S.tecnica,
        event: events[7].id,
        category: 'Infraestrutura',
        impact: 'Interrupção de transmissão por 6 minutos.',
        urgency: 'critical',
        priority: 'critical',
        owner: TIAGO_ID,
        identifiedBy: BRUNO_ID,
        due: at(-5, 12, 0).slice(0, 10),
        rootCause: 'Cabo tensionado na instalação, sem passagem protegida.',
        result: 'Cabo substituído e passagem protegida com eletroduto.',
      },
    ];

    for (const problem of problems) {
      await client.query(
        `insert into problems
           (id, code, title, description, identified_by, sector_id, event_id, category,
            impact, urgency, priority, status, owner_id, root_cause,
            cause_confirmed_by, cause_confirmed_at, resolution_due, final_result, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::severity_level, $11::severity_level,
                 $12::problem_status, $13, $14,
                 case when $14::text is not null then $13::uuid else null end,
                 case when $14::text is not null then now() - interval '2 days' else null end,
                 $15::date, $16, $5)
         on conflict (id) do nothing`,
        [
          problem.id,
          problem.code,
          problem.title,
          problem.description,
          problem.identifiedBy,
          problem.sector,
          problem.event,
          problem.category,
          problem.impact,
          problem.urgency,
          problem.priority,
          problem.status,
          problem.owner,
          problem.rootCause ?? null,
          problem.due,
          problem.result ?? null,
        ],
      );

      await client.query(
        `insert into problem_updates (problem_id, user_id, kind, body, created_at)
         values ($1, $2, 'comment', $3, now() - interval '6 days')`,
        [problem.id, problem.identifiedBy, 'Problema registrado a partir da operação do evento.'],
      );
    }

    await client.query(
      `insert into problem_updates (problem_id, user_id, kind, body, from_status, to_status, created_at)
       values ($1, $2, 'status', 'Causa confirmada após testes com o equipamento reserva.',
               'in_analysis', 'solution_proposed', now() - interval '2 days')`,
      [problem1, TIAGO_ID],
    );

    const solution1 = 'a1000000-0000-4000-8000-000000000001';
    await client.query(
      `insert into problem_solutions
         (id, problem_id, description, rationale, resources, risks, expected_effects,
          executors, test_method, success_criteria, rollback_plan, requires_authorization, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
       on conflict (id) do nothing`,
      [
        solution1,
        problem1,
        'Substituir o microfone sem fio 3 e o receptor correspondente por conjunto novo em faixa reservada.',
        'O equipamento atual está fora do prazo de garantia e apresenta falhas recorrentes.',
        'Aquisição de conjunto microfone + receptor e horas de teste da equipe técnica.',
        'Necessidade de nova faixa de frequência e pequena parada durante a troca.',
        'Eliminação das quedas de sinal e maior estabilidade na transmissão.',
        'Tiago Moraes (técnica) e Camila Ferreira (mídia).',
        'Teste em dois cultos consecutivos, com monitoramento de sinal.',
        'Nenhuma queda de sinal registrada em quatro blocos de teste.',
        'Reinstalar o conjunto anterior e reabrir a análise de causa.',
        TIAGO_ID,
      ],
    );

    const auth1 = 'a2000000-0000-4000-8000-000000000001';
    await client.query(
      `insert into authorization_requests
         (id, problem_id, solution_id, requested_by, scope, deciders, due_at, status)
       values ($1, $2, $3, $4, $5, $6::uuid[], $7::date, 'pending')
       on conflict (id) do nothing`,
      [
        auth1,
        problem1,
        solution1,
        TIAGO_ID,
        'Aquisição de conjunto de microfone sem fio e receptor, com instalação e teste assistido.',
        [HELENA_ID, RAFAEL_ID],
        at(9, 12, 0).slice(0, 10),
      ],
    );
    await client.query(
      `insert into problem_updates (problem_id, user_id, kind, body, created_at)
       values ($1, $2, 'authorization', 'Solicitação de autorização enviada à liderança sênior.', now() - interval '2 days')`,
      [problem1, TIAGO_ID],
    );

    // ---------------------------------------------------------------
    // Erros operacionais
    // ---------------------------------------------------------------
    const errors = [
      {
        id: 'b1000000-0000-4000-8000-000000000001',
        event: events[0].id,
        sector: S.tecnica,
        category: 'Técnica',
        severity: 'high',
        impact: 'Perda de áudio por cerca de 20 segundos.',
        description: 'Microfone sem fio 3 perdeu sinal durante a mensagem.',
        immediateAction: 'Troca imediata para microfone reserva.',
        stage: 'Mensagem',
        status: 'in_analysis',
        follow: TIAGO_ID,
        problem: problem1,
        report: reportFinal,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000002',
        event: events[1].id,
        sector: S.midia,
        category: 'Comunicação',
        severity: 'medium',
        impact: 'Início da transmissão com 4 minutos de atraso.',
        description: 'Aviso de início da transmissão não chegou à equipe de mídia.',
        immediateAction: 'Comunicação direta por rádio.',
        stage: 'Abertura',
        status: 'open',
        follow: CAMILA_ID,
        problem: null,
        report: reportDraft,
      },
      {
        id: 'b1000000-0000-4000-8000-000000000003',
        event: events[2].id,
        sector: S.producao,
        category: 'Operacional',
        severity: 'low',
        impact: 'Início do ensaio 10 minutos atrasado.',
        description: 'Palco liberado após o horário previsto.',
        immediateAction: 'Ensaio iniciado com a equipe presente.',
        stage: 'Pré-evento',
        status: 'resolved',
        follow: RAFAEL_ID,
        problem: null,
        report: reportReview,
      },
    ];

    for (const error of errors) {
      await client.query(
        `insert into operational_errors
           (id, event_id, sector_id, category, severity, impact, occurred_at, description,
            immediate_action, stage, status, follow_up_user_id, problem_id, report_id, created_by)
         values ($1, $2, $3, $4, $5::severity_level, $6, now() - interval '4 days', $7, $8, $9,
                 $10::error_status, $11, $12, $13, $14)
         on conflict (id) do nothing`,
        [
          error.id,
          error.event,
          error.sector,
          error.category,
          error.severity,
          error.impact,
          error.description,
          error.immediateAction,
          error.stage,
          error.status,
          error.follow,
          error.problem,
          error.report,
          CAMILA_ID,
        ],
      );
    }

    await client.query(
      `insert into error_notes (error_id, note, user_id, created_at)
       values ($1, 'Equipamento reserva assumiu o canal 3 sem novas falhas.', $2, now() - interval '3 days')`,
      [errors[0].id, TIAGO_ID],
    );

    // ---------------------------------------------------------------
    // Ocorrências administrativas
    // ---------------------------------------------------------------
    await client.query(
      `insert into occurrences
         (person_name, type, description, event_id, action_taken, penalty, status, created_by)
       values
         ('Bruno Alves', 'Atraso', 'Chegou 25 minutos após o horário de apresentação da escala.',
          $1, 'Conversa de alinhamento realizada no mesmo dia.', null, 'under_review', $2),
         ('Juliana Reis', 'Reconhecimento', 'Organizou o acolhimento de forma exemplar em evento com grande público.',
          $3, 'Registro positivo enviado à liderança.', null, 'closed', $2)`,
      [events[1].id, HELENA_ID, events[0].id],
    );

    // ---------------------------------------------------------------
    // Escalas e prontidão
    // ---------------------------------------------------------------
    const schedules = [
      { id: 'b2000000-0000-4000-8000-000000000001', event: events[3].id, sector: S.tecnica, role: 'Operador de som', user: TIAGO_ID, call: at(3, 7, 30), status: 'published', readiness: 'ready' },
      { id: 'b2000000-0000-4000-8000-000000000002', event: events[3].id, sector: S.midia, role: 'Operador de transmissão', user: BRUNO_ID, call: at(3, 8, 0), status: 'published', readiness: 'attention' },
      { id: 'b2000000-0000-4000-8000-000000000003', event: events[3].id, sector: S.acolhimento, role: 'Acolhimento', user: JULIANA_ID, call: at(3, 8, 15), status: 'published', readiness: null },
      { id: 'b2000000-0000-4000-8000-000000000004', event: events[3].id, sector: S.midia, role: 'Líder de mídia', user: CAMILA_ID, call: at(3, 7, 45), status: 'draft', readiness: null },
      { id: 'b2000000-0000-4000-8000-000000000005', event: events[4].id, sector: S.louvor, role: 'Backing vocal', user: RAFAEL_ID, call: at(3, 17, 30), status: 'draft', readiness: null },
    ];

    for (const schedule of schedules) {
      await client.query(
        `insert into schedules
           (id, event_id, sector_id, role_title, user_id, instructions, call_time, status, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8::assignment_status, $9)
         on conflict (id) do nothing`,
        [
          schedule.id,
          schedule.event,
          schedule.sector,
          schedule.role,
          schedule.user,
          'Apresentar-se uniformizado no posto designado.',
          schedule.call,
          schedule.status,
          RAFAEL_ID,
        ],
      );

      await client.query(
        `insert into schedule_history (schedule_id, changed_by, to_user_id, action, reason)
         values ($1, $2, $3, 'created', 'Designação criada')`,
        [schedule.id, RAFAEL_ID, schedule.user],
      );

      if (schedule.status === 'published') {
        await client.query(
          `insert into schedule_history (schedule_id, changed_by, to_user_id, action, reason)
           values ($1, $2, $3, 'published', 'Escala publicada')`,
          [schedule.id, RAFAEL_ID, schedule.user],
        );
      }
      if (schedule.readiness) {
        await client.query(
          `insert into readiness_confirmations (schedule_id, user_id, state, note)
           values ($1, $2, $3::readiness_state, $4)`,
          [
            schedule.id,
            schedule.user,
            schedule.readiness,
            schedule.readiness === 'attention' ? 'Chegarei direto da faculdade, posso atrasar 10 minutos.' : null,
          ],
        );
      }
    }

    // ---------------------------------------------------------------
    // Acervo de mídia
    // ---------------------------------------------------------------
    const mediaRecords = [
      { date: at(-4, 9, 0).slice(0, 10), time: '09:00', preacher: 'Pr. Samuel Andrade', event: 'Culto da Manhã', status: 'published', editor: BRUNO_ID, publisher: CAMILA_ID, platform: 'YouTube', url: 'https://youtube.com/watch?v=exemplo1' },
      { date: at(-4, 18, 30).slice(0, 10), time: '18:30', preacher: 'Pr. Samuel Andrade', event: 'Culto da Noite', status: 'awaiting_publication', editor: BRUNO_ID, publisher: CAMILA_ID, platform: 'YouTube', url: null },
      { date: at(-7, 19, 30).slice(0, 10), time: '19:30', preacher: 'Pra. Ana Lúcia', event: 'Ensaio Geral', status: 'in_edit', editor: BRUNO_ID, publisher: null, platform: null, url: null },
      { date: at(-11, 19, 0).slice(0, 10), time: '19:00', preacher: 'Pr. Samuel Andrade', event: 'Transmissão Especial', status: 'reported_lost', editor: null, publisher: null, platform: null, url: null },
      { date: at(-14, 9, 0).slice(0, 10), time: '09:00', preacher: 'Pr. Daniel Rocha', event: 'Culto da Manhã', status: 'published', editor: JULIANA_ID, publisher: CAMILA_ID, platform: 'Instagram', url: 'https://instagram.com/p/exemplo2' },
      { date: at(-18, 18, 30).slice(0, 10), time: '18:30', preacher: 'Pra. Ana Lúcia', event: 'Culto da Noite', status: 'not_found', editor: null, publisher: null, platform: null, url: null },
      { date: at(-21, 9, 0).slice(0, 10), time: '09:00', preacher: 'Pr. Samuel Andrade', event: 'Culto da Manhã', status: 'awaiting_edit', editor: null, publisher: null, platform: null, url: null },
      { date: at(3, 9, 0).slice(0, 10), time: '09:00', preacher: 'Pr. Samuel Andrade', event: 'Culto da Manhã', status: 'awaiting_edit', editor: BRUNO_ID, publisher: CAMILA_ID, platform: null, url: null },
    ];

    for (const record of mediaRecords) {
      const { rows } = await client.query(
        `insert into media_records
           (service_date, service_time, preacher, event_name, record_type, status,
            editor_id, publisher_id, platform, published_url, created_by)
         values ($1::date, $2::time, $3, $4, 'Gravação e transmissão', $5::media_status,
                 $6, $7, $8, $9, $10)
         returning id`,
        [
          record.date,
          record.time,
          record.preacher,
          record.event,
          record.status,
          record.editor,
          record.publisher,
          record.platform,
          record.url,
          CAMILA_ID,
        ],
      );
      await client.query(
        `insert into media_history (media_id, user_id, to_status, comment, created_at)
         values ($1, $2, $3::media_status, 'Registro criado após o evento.', now() - interval '3 days')`,
        [rows[0].id, CAMILA_ID, record.status],
      );
      if (record.status === 'published') {
        await client.query(
          `insert into media_history (media_id, user_id, from_status, to_status, comment, created_at)
           values ($1, $2, 'awaiting_publication', 'published', 'Publicado no canal oficial.', now() - interval '2 days')`,
          [rows[0].id, CAMILA_ID],
        );
      }
    }

    // ---------------------------------------------------------------
    // Notificações e auditoria inicial
    // ---------------------------------------------------------------
    const notifications = [
      [ADMIN_ID, 'Solicitação de autorização', 'PRB-0001 — Falha intermitente no microfone sem fio', '/m/studio/problems/' + problem1],
      [ADMIN_ID, 'Escala publicada', 'Operador de som — Culto da Manhã', '/m/studio/schedules'],
      [BRUNO_ID, 'Nova designação em escala', 'Operador de transmissão', '/m/studio/schedules'],
      [HELENA_ID, 'Relatório enviado para revisão', 'Relatório — Ensaio Geral', '/m/studio/reports/' + reportReview],
      [TIAGO_ID, 'Conteúdo aguardando edição', 'Culto da Manhã — Pr. Samuel Andrade', '/m/studio/media'],
    ];
    for (const [userId, title, body, link] of notifications) {
      await client.query(
        `insert into notifications (user_id, title, body, link, module_key)
         values ($1, $2, $3, $4, 'studio')`,
        [userId, title, body, link],
      );
    }

    const admin = { id: ADMIN_ID, full_name: 'Davi Gomes' };
    await audit(client as any, admin, {
      action: 'platform.bootstrap',
      entity: 'platform',
      entityId: 'seed',
      after: { users: USERS.length, events: events.length, modules: 2 },
      moduleKey: 'platform',
    });

    console.log('seed concluído com sucesso.');
    console.log(`usuários: ${USERS.length} | eventos: ${events.length} | mídias: ${mediaRecords.length}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('falha no seed:', err);
  process.exit(1);
});
