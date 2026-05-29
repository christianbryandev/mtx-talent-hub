export const getEmailHtml = ({
  nome,
  title,
  body,
  buttonText,
  buttonUrl,
  warning,
  appUrl = "https://mtxmarketing.com",
}: {
  nome: string;
  title: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  warning?: string;
  appUrl?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background-color: #0a0a0a; 
      color: #cccccc; 
      margin: 0; 
      padding: 0; 
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0a0a0a;
      padding-bottom: 40px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 40px 20px; 
    }
    .logo-container {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      height: 60px;
      width: auto;
    }
    .card { 
      background-color: #111118; 
      border-radius: 12px; 
      padding: 40px; 
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    h1 { 
      color: #ffffff; 
      font-size: 28px; 
      font-weight: 700;
      margin-bottom: 24px; 
      margin-top: 0;
      text-align: left;
    }
    p { 
      font-size: 15px; 
      line-height: 1.7; 
      color: #cccccc; 
      margin-bottom: 20px;
    }
    .highlight {
      color: #ffffff;
      font-weight: 600;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn { 
      display: inline-block; 
      background: linear-gradient(to right, #DD2A7B, #8131AF); 
      color: #ffffff !important; 
      padding: 16px 32px; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 700; 
      font-size: 16px;
    }
    .divider {
      height: 1px;
      background-color: rgba(255, 255, 255, 0.06);
      margin: 32px 0;
    }
    .footer { 
      font-size: 14px; 
      color: #ffffff; 
      text-align: center;
    }
    .footer a {
      color: #C7288B;
      text-decoration: none;
      font-weight: 600;
    }
    .warning { 
      font-size: 12px; 
      color: #666666; 
      margin-top: 24px; 
      text-align: center;
    }
    .copyright {
      font-size: 11px;
      color: #444444;
      margin-top: 16px;
      text-align: center;
    }
    @media only screen and (max-width: 480px) {
      .card { padding: 32px 20px; }
      h1 { font-size: 24px; }
      .btn { width: 100%; box-sizing: border-box; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo-container">
        <img src="${appUrl}/mtx-hub-logo.png" alt="MTX Hub Logo" class="logo">
      </div>
      <div class="card">
        <h1>${title}</h1>
        <p>Olá, <span class="highlight">${nome}</span>!</p>
        ${body}
        
        <div class="btn-container">
          <a href="${buttonUrl}" class="btn">${buttonText}</a>
        </div>
        
        ${warning ? `<p class="warning">${warning}</p>` : ""}
        
        <div class="divider"></div>
        
        <div class="footer">
          <strong>Equipe MTX • Multiplicando Talentos</strong><br>
          <a href="https://mtxmarketing.com">mtxmarketing.com</a>
        </div>
        
        <div class="copyright">
          © 2026 MTX Marketing. Todos os direitos reservados.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
