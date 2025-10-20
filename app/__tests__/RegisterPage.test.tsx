// app/__tests__/RegisterPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../register/page';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs'; // Importamos bcryptjs

// Mock de los hooks y módulos externos
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock para bcryptjs (importante para evitar errores de hashing en el entorno de prueba)
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword123'), // Simula el hashing
}));

// Mock global para la función fetch
global.fetch = jest.fn();

describe('RegisterPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    // Resetea los mocks antes de cada prueba
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear(); // Limpiamos el mock de fetch
    mockRouter.push.mockClear();
    // Limpiamos el mock de bcrypt si fuera necesario (aunque ya devuelve un valor fijo)
    (bcrypt.hash as jest.Mock).mockClear();
  });

  it('debería renderizar el formulario de registro correctamente', () => {
    render(<RegisterPage />);

    // Verifica que los elementos importantes estén en el documento
    expect(screen.getByRole('heading', { name: /registro/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar/i })).toBeInTheDocument();
  });

  it('debería llamar a fetch con los datos correctos al enviar el formulario', async () => {
    render(<RegisterPage />);

    // Simula que el usuario escribe en los campos
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/correo electrónico/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), {
      target: { value: 'password123' },
    });

    // Simula el clic en el botón de registrar
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

    // Espera a que la lógica asíncrona (hash + fetch) se complete
    // Usamos waitFor para asegurarnos de que fetch ha sido llamado
    await waitFor(() => {
      // Verifica que fetch fue llamado con la URL y los datos correctos
      expect(fetch).toHaveBeenCalledWith('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El body debe contener los datos del formulario, la contraseña NO se envía hasheada desde el frontend
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123', // El frontend envía la contraseña en texto plano
        }),
      });
    });
     // Verifica que bcrypt.hash fue llamado (porque el componente lo usa internamente antes de fetch)
     // Esta verificación es opcional ya que es un detalle de implementación,
     // pero puede ser útil si quieres asegurar que el hashing ocurre.
     expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
  });

  it('debería redirigir a la página de login si el registro es exitoso', async () => {
    // Configura el mock de fetch para simular una respuesta exitosa (status 200 OK)
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}), // Devuelve un objeto vacío como respuesta JSON
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/correo electrónico/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

    // Esperamos a que la promesa de fetch se resuelva Y que la redirección se ejecute
    await waitFor(() => {
       // Verifica que se llamó a la función de redirección al login
       expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

  });

  it('debería mostrar un mensaje de error si el registro falla (respuesta no ok)', async () => {
    // Configura el mock de fetch para simular una respuesta de error (ej. usuario ya existe)
    (fetch as jest.Mock).mockResolvedValue({
      ok: false, // Indica que la respuesta no fue exitosa
      json: async () => ({ error: 'User already exists' }), // Mensaje de error simulado
    });

    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

    // Espera a que aparezca el mensaje de error en el DOM
    const errorMessage = await screen.findByText(/user already exists/i);
    expect(errorMessage).toBeInTheDocument();
    // También verifica que NO se haya intentado redirigir
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('debería mostrar un mensaje de error genérico si fetch lanza una excepción', async () => {
    // Configura el mock de fetch para que lance un error (simula problema de red, etc.)
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

    // Espera a que aparezca el mensaje de error genérico en el DOM
    const errorMessage = await screen.findByText(/error interno/i);
    expect(errorMessage).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});