export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  // Previously enforced admin/moderator auth. For local/dev and public access
  // remove the guard so admin pages are reachable without login.
  return <>{children}</>;
};
