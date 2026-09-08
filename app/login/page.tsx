import { listMockAuthCandidates } from "@/app/actions/mock-auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { MockUserPicker } from "@/components/auth/mock-user-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isMockAuthEnabled } from "@/lib/auth/env";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error:
    "Accesso non completato. Riprova o contatta l'amministratore.",
  oauth_start_failed: "Impossibile avviare l'accesso con Google.",
  access_denied:
    "Accesso negato. Il tuo indirizzo email potrebbe non essere autorizzato.",
  mock_auth_failed: "Accesso mock non riuscito.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, reason } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth_callback_error)
    : null;

  const mockEnabled = isMockAuthEnabled();
  const mockCandidates = mockEnabled ? await listMockAuthCandidates() : null;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Hestia</CardTitle>
          <CardDescription>
            {mockEnabled
              ? "Scegli un utente per entrare (ambiente di sviluppo)."
              : "Accedi con il tuo account Google autorizzato."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Errore di accesso</AlertTitle>
              <AlertDescription>
                {errorMessage}
                {reason ? (
                  <span className="mt-2 block text-xs opacity-80">{reason}</span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {mockEnabled && mockCandidates ? (
            <MockUserPicker candidates={mockCandidates} />
          ) : (
            <GoogleSignInButton />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
