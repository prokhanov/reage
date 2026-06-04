import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

/**
 * Клиентский fallback для пограничных случаев SPA-навигации
 * (например, переход по <Link> на удалённый ресурс).
 * Для прямых заходов с неверного URL nginx сам отдаёт public/404.html
 * с корректным HTTP-статусом 404.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: маршрут не найден:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Страница не найдена — ReAge</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-7xl font-bold tracking-tight text-foreground">404</div>
          <h1 className="mb-3 text-xl font-semibold text-foreground">Страница не найдена</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Возможно, ссылка устарела или адрес введён с ошибкой.
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            На главную
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
