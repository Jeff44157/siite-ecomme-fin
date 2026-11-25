(function () {
  function init() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const message = document.getElementById('auth-message');
    if (!tabLogin || !tabRegister || !loginForm || !registerForm || !message) return;

    function setMessage(text, type) {
      message.textContent = text;
      message.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#a1a1aa';
    }

    function switchTab(mode) {
      const isLogin = mode === 'login';
      tabLogin.classList.toggle('active', isLogin);
      tabRegister.classList.toggle('active', !isLogin);
      loginForm.classList.toggle('active', isLogin);
      registerForm.classList.toggle('active', !isLogin);
      setMessage('', 'info');
    }

    function storeSession(data) {
      if (data.token) localStorage.setItem('ithaven_token', data.token);
      if (data.user) localStorage.setItem('ithaven_user', JSON.stringify(data.user));
      const link = document.getElementById('account-link');
      if (link && data.user?.name) link.setAttribute('title', `Connecté : ${data.user.name}`);
    }

    async function submitForm(form, endpoint, payload, successMessage) {
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      setMessage('Veuillez patienter...', 'info');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(result.message || result.error || 'Erreur lors de la requête.', 'error');
          return;
        }
        storeSession(result);
        setMessage(`${successMessage} Redirection...`, 'success');
        setTimeout(() => {
          window.location.href = result.user?.role === 'admin' ? 'admin.html' : 'index.html';
        }, 900);
      } catch (_) {
        setMessage('Serveur indisponible. Démarrez le serveur avec npm start.', 'error');
      } finally {
        if (button) button.disabled = false;
      }
    }

    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));

    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitForm(
        loginForm,
        '/api/auth/login',
        {
          email: document.getElementById('login-email').value.trim(),
          password: document.getElementById('login-password').value
        },
        'Connexion réussie.'
      );
    });

    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitForm(
        registerForm,
        '/api/auth/register',
        {
          name: document.getElementById('register-name').value.trim(),
          email: document.getElementById('register-email').value.trim(),
          password: document.getElementById('register-password').value
        },
        'Compte créé avec succès.'
      );
    });

    const user = JSON.parse(localStorage.getItem('ithaven_user') || 'null');
    if (user?.name) {
      setMessage(`Vous êtes connecté en tant que ${user.name}.`, 'success');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
