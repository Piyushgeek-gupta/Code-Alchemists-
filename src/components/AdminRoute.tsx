import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isModerator, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
