export default function ForbiddenPage() {
  return (
    <div className="text-center mt-20 flex flex-col items-center gap-4">
      <img src="notAuth.svg" alt="" className="md:w-[30rem] " />
      <h1 className="text-4xl font-bold">403 - Forbidden</h1>
      <p>You do not have permission to view this page.</p>
    </div>
  );
}
