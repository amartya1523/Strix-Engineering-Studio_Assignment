// Intentionally flawed sample. Upload it to try a performance or quality review.
export function Dashboard({ items }: { items: { id: string; name: string }[] }) {
  return <div>{items.map((item, index) => <div key={index}>{item.name}</div>)}</div>;
}
