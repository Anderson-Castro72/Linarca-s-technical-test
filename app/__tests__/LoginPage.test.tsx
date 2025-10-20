// app/__tests__/LoginPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../login/page';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Mock de los hooks y módulos de Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

describe('LoginPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    // Resetea los mocks antes de cada prueba
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (signIn as jest.Mock).mockClear();
    mockRouter.push.mockClear();
  });

  it('debería renderizar el formulario de login correctamente', () => {
    render(<LoginPage />);

    // Verifica que los elementos importantes estén en el documento
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('debería llamar a signIn con las credenciales correctas al enviar el formulario', async () => {
    render(<LoginPage />);

    // Simula que el usuario escribe en los campos
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), {
      target: { value: 'password123' },
    });

    // Simula el clic en el botón de enviar
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    // Verifica que signIn fue llamado con los datos correctos
    expect(signIn).toHaveBeenCalledWith('credentials', {
      redirect: false,
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('debería redirigir a la página principal si el login es exitoso', async () => {
    // Configura el mock de signIn para que simule un éxito
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    
    // Esperamos a que la promesa de signIn se resuelva
    await screen.findByRole('heading'); // Espera a que el componente se re-renderice

    // Verifica que se llamó a la función de redirección
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('debería mostrar un mensaje de error si el login falla', async () => {
    // Configura el mock de signIn para que simule un error
    (signIn as jest.Mock).mockResolvedValue({ error: 'Credenciales inválidas' });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    
    // Espera a que aparezca el mensaje de error en el DOM
    const errorMessage = await screen.findByText(/credenciales inválidas/i);
    expect(errorMessage).toBeInTheDocument();
  });
});