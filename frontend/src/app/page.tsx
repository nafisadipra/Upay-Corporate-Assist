import { LoginForm } from '@/components/LoginForm';
import { AuthProvider } from '@/context/AuthContext';

export default function Page() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
