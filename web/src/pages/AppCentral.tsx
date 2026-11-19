export default function AppCentral() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia!" : hour < 18 ? "Boa tarde!" : "Boa noite!";

  return (
    <main
      className="min-h-screen w-full bg-[#0B0D10] px-5 py-8 text-[#F4F5F6] sm:px-8 sm:py-10"
      aria-label="MMV CONNECT"
    >
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-sm font-medium tracking-wide text-[#A4B4C5]">
          {greeting}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Vamos começar?
        </h1>
      </section>
    </main>
  );
}
