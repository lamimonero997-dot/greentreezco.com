export default function NotFound({ path }) {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p>No page is registered for “{path}”.</p>
      <p>
        <a href="/">Go to the homepage</a>
      </p>
    </div>
  );
}
