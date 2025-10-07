Server for Code Race Relay

This small Express server provides a secure /submit endpoint that uses the Supabase service role to persist submissions and update participant scores.

Setup

1. Copy `.env.example` to `.env` and fill in your Supabase project URL and service role key (do NOT commit the service role key).

2. Install dependencies and start the server:

```powershell
Set-Location -Path "server"
npm install
npm start
```

3. By default the server listens on port 8787. You can change this with the `PORT` environment variable.

Endpoint

- POST /submit
  - Headers: Authorization: Bearer <access_token>
  - Body (JSON): { participantId: string, questionId?: string | null, submittedCode?: string | null, points: number }
  - Response: { success: true, data: ... }

The server verifies the provided access token (optional check) and calls the `submit_and_increment` RPC if available. If RPC is not available it will insert a submission and update the participant score directly.
