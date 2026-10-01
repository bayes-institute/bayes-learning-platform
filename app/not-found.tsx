import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="not-found-title">
        <p className="eyebrow"><span className="eyebrow-mark" /> 404</p>
        <h1 id="not-found-title">This path leads <em>nowhere.</em></h1>
        <p>The page you were looking for has moved, or it may never have existed.</p>
        <Link className="button button-primary" href="/">Return home <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
