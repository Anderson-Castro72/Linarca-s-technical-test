// app/__tests__/RegisterPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../register/page';
import { useRouter } from 'next/navigation';
// NO se importa bcryptjs

// Mock de los hooks y módulos externos
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock global para la función fetch
global.fetch = jest.fn();

describe('RegisterPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();
    // NO se resetea bcrypt
  });

  it('debería renderizar el formulario de registro correctamente', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /registro/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar/i })).toBeInTheDocument();
  });

  it('debería llamar a fetch con los datos correctos al enviar el formulario', async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/correo electrónico/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

    // Esperamos solo a que fetch sea llamado (ya no hay hash antes)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123', // Correcto: se envía en texto plano
        }),
      });
    });
    // NO se verifica bcrypt.hash
  });

  it('debería redirigir a la página de login si el registro es exitoso', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    render(<RegisterPage />);
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/correo electrónico/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));
    await waitFor(() => {
       expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('debería mostrar un mensaje de error si el registro falla (respuesta no ok)', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'User already exists' }), // Error viene del backend (inglés)
    });
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));
    await waitFor(() => {
      // Buscamos el error que viene de la API
      expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('debería mostrar un mensaje de error genérico si fetch lanza una excepción', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error')); // Simula fallo de fetch
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

    // Espera explícitamente a que aparezca "Error interno"
    await waitFor(() => {
      // Buscamos el error definido en el catch del componente (español)
      expect(screen.getByText(/error interno/i)).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled(); // Verifica que no redirige
  });
});