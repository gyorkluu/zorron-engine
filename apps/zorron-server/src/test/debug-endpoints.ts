import { createApp } from '../app';

const app = createApp();

async function main() {
  // Register
  const registerRes = await app.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `debug-${Date.now()}@test.zorron.io`,
        password: 'password123',
        nickname: 'Debug',
      }),
    }),
  );
  const registerBody = await registerRes.json();
  console.log('Register status:', registerRes.status);
  console.log('Register body:', registerBody);

  const cookies = registerRes.headers.get('set-cookie') ?? '';
  const refreshTokenMatch = /refreshToken=([^;]+)/.exec(cookies);
  const refreshToken = refreshTokenMatch?.[1];
  console.log('Refresh token:', refreshToken);

  // Logout
  const logoutRes = await app.handle(
    new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: `refreshToken=${refreshToken}` },
    }),
  );
  const logoutBody = await logoutRes.text();
  console.log('Logout status:', logoutRes.status);
  console.log('Logout body:', logoutBody);
  console.log('Logout set-cookie:', logoutRes.headers.get('set-cookie'));

  // Create project
  const projectRes = await app.handle(
    new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`,
      },
      body: JSON.stringify({ title: `debug-project-${Date.now()}` }),
    }),
  );
  const projectBody = await projectRes.json();
  console.log('Project create status:', projectRes.status);
  console.log('Project body:', projectBody);

  // Delete project
  const deleteProjectRes = await app.handle(
    new Request(`http://localhost/api/projects/${projectBody.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${registerBody.token}` },
    }),
  );
  const deleteProjectBody = await deleteProjectRes.text();
  console.log('Project delete status:', deleteProjectRes.status);
  console.log('Project delete body:', deleteProjectBody);
}

main().catch(console.error);
