import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-teal-50 p-6 text-center">
            <div className="max-w-md w-full space-y-6 bg-white shadow-lg rounded-2xl p-6">
                <h1 className="text-3xl font-bold text-teal-700">Bem-vindo 👋</h1>
                <p className="text-gray-600">Gerencie seus gastos mesmo offline.</p>

                <div className="flex flex-col gap-4">
                    <Link
                        href="/login"
                        className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md transition"
                    >
                        Fazer Login
                    </Link>
                    <Link
                        href="/register"
                        className="bg-gray-200 hover:bg-gray-300 text-teal-800 py-2 px-4 rounded-md transition"
                    >
                        Registre-se
                    </Link>
                </div>
            </div>
        </main>
    );
}
