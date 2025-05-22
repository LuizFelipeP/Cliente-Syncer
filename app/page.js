import Link from "next/link";

export default function Home() {
  return (
      <div>
        <h1>Bem-vindo</h1>
          <link rel="manifest" href="/manifest.json" />
        <Link href="/login">Fazer Login</Link>
          <Link href="/register">Registre-se</Link>
      </div>
  );
}
