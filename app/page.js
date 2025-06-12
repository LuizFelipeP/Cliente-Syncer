import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <h1 className={styles.title}>Bem-vindo</h1>
                <p className={styles.subtitle}>Gerencie seus gastos mesmo offline.</p>

                <Link href="/login" className={`${styles.button} ${styles.login}`}>
                    Fazer Login
                </Link>
                <Link href="/register" className={`${styles.button} ${styles.register}`}>
                    Registre-se
                </Link>
            </div>
        </main>
    );
}
