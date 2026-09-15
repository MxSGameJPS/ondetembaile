import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return new Resend(apiKey);
}

const SENDER_EMAIL = 'Aonde Tem Baile <contato@aondetembaile.com.br>';
const SITE_URL = 'https://aondetembaile.com.br';

/**
 * Common HTML wrapper layout for all brand emails
 */
function getEmailWrapper(contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aonde Tem Baile</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f3f4f6;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #141417; border-radius: 16px; border: 1px solid rgba(242, 106, 0, 0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden;">
          
          <!-- Header Bar with Brand Logo Badge -->
          <tr>
            <td style="background: linear-gradient(135deg, #181512 0%, #0d0c0a 100%); padding: 28px 30px; text-align: center; border-bottom: 1px solid rgba(242, 106, 0, 0.2);">
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #F26A00 0%, #FF9900 100%); display: inline-block; text-align: center; line-height: 44px; font-size: 22px; box-shadow: 0 4px 15px rgba(242, 106, 0, 0.4);">
                      🪩
                    </div>
                  </td>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em; font-style: italic; line-height: 1.1;">
                      AONDE TEM <span style="color: #F26A00;">BAILE</span>
                    </div>
                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-top: 2px;">
                      A diversão começa aqui!
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 30px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color: #0c0c0e; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #6b7280; line-height: 1.6;">
              <p style="margin: 0 0 8px 0; color: #9ca3af;">
                <strong>Aonde Tem Baile</strong> — O portal oficial de eventos regionais do Brasil.
              </p>
              <p style="margin: 0 0 12px 0;">
                <a href="${SITE_URL}/termos-de-uso" style="color: #F26A00; text-decoration: none;">Termos de Uso</a> &nbsp;•&nbsp; 
                <a href="${SITE_URL}" style="color: #F26A00; text-decoration: none;">Acessar o Site</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                © ${new Date().getFullYear()} Aonde Tem Baile. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Email Template 1: Welcome & Producer Account Confirmation
 */
export async function sendWelcomeEmail(toEmail: string, producerName: string) {
  try {
    const htmlContent = getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: rgba(242, 106, 0, 0.15); border: 1px solid rgba(242, 106, 0, 0.35); color: #F26A00; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
          🎉 Conta de Produtor Criada
        </span>
      </div>

      <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; text-align: center;">
        Seja muito bem-vindo(a), ${producerName}!
      </h1>
      
      <p style="font-size: 15px; color: #d1d5db; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
        Sua conta de produtor no <strong>Aonde Tem Baile</strong> foi criada com sucesso! Agora você faz parte da maior vitrine de bailes, festas e eventos regionais.
      </p>

      <!-- Feature Card Box -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #1c1c20; border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 28px;">
        <tr>
          <td>
            <div style="font-size: 14px; font-weight: 700; color: #F26A00; margin-bottom: 12px;">
              ✨ O que você pode fazer agora:
            </div>
            
            <div style="font-size: 14px; color: #e5e7eb; margin-bottom: 10px; display: flex; align-items: center;">
              <span style="color: #10b981; font-weight: bold; margin-right: 8px;">✓</span>
              Divulgar seus bailes e festas gratuitamente para milhares de pessoas
            </div>
            
            <div style="font-size: 14px; color: #e5e7eb; margin-bottom: 10px; display: flex; align-items: center;">
              <span style="color: #10b981; font-weight: bold; margin-right: 8px;">✓</span>
              Receber contatos de interessados direto no seu WhatsApp
            </div>
            
            <div style="font-size: 14px; color: #e5e7eb; display: flex; align-items: center;">
              <span style="color: #10b981; font-weight: bold; margin-right: 8px;">✓</span>
              Acompanhar e gerenciar seus eventos no seu Painel de Produtor
            </div>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${SITE_URL}/produtor/novo-evento" style="background: linear-gradient(135deg, #F26A00 0%, #FF9900 100%); color: #000000; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 6px 20px rgba(242, 106, 0, 0.35);">
          🚀 Cadastrar Meu Primeiro Evento
        </a>
      </div>

      <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 16px 0 0 0;">
        Se você tiver qualquer dúvida, nossa equipe está pronta para te ajudar.
      </p>
    `);

    const data = await getResendClient().emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: '🎉 Bem-vindo ao Aonde Tem Baile! Sua conta de produtor foi criada',
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error);
    return { success: false, error };
  }
}

/**
 * Email Template 2: Event Submission Confirmation (Pending Moderation)
 */
export async function sendEventSubmittedEmail(toEmail: string, producerName: string, eventTitle: string) {
  try {
    const htmlContent = getEmailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #f59e0b; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
          📝 Evento Recebido em Análise
        </span>
      </div>

      <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; text-align: center;">
        Recebemos o cadastro do seu evento!
      </h1>

      <p style="font-size: 15px; color: #d1d5db; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
        Olá <strong>${producerName}</strong>, seu evento foi cadastrado com sucesso e está em análise pela nossa equipe de moderação.
      </p>

      <!-- Event Summary Box -->
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #1c1c20; border-radius: 12px; padding: 20px; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 24px;">
        <tr>
          <td>
            <div style="font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">
              Nome do Evento:
            </div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 16px;">
              "${eventTitle}"
            </div>
            
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px;">
              <span style="font-size: 13px; color: #fef3c7;">
                <strong>Status Atual:</strong> <span style="color: #f59e0b; font-weight: 800;">Pendente de Moderação</span>
              </span>
            </div>
          </td>
        </tr>
      </table>

      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
        Analisamos as submissões rapidamente! Assim que a moderação aprovar, o evento ficará visível publicamente no site e você receberá uma confirmação por e-mail.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${SITE_URL}/produtor/dashboard" style="background: #27272a; border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; display: inline-block;">
          📊 Acompanhar no Meu Painel
        </a>
      </div>
    `);

    const data = await getResendClient().emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: `📝 Evento Recebido: "${eventTitle}" — Em análise`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar e-mail de evento cadastrado:', error);
    return { success: false, error };
  }
}

/**
 * Email Template 3: Event Approved / Rejected Status Notification
 */
export async function sendEventStatusEmail(
  toEmail: string,
  producerName: string,
  eventTitle: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
) {
  try {
    const isApproved = status === 'approved';
    const subject = isApproved
      ? `🎉 Seu evento "${eventTitle}" foi APROVADO!`
      : `⚠️ Atualização sobre seu evento "${eventTitle}"`;

    const htmlContent = isApproved
      ? getEmailWrapper(`
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
              🚀 Evento Aprovado e no Ar
            </span>
          </div>

          <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; text-align: center;">
            Parabéns, ${producerName}!
          </h1>

          <p style="font-size: 15px; color: #d1d5db; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
            Seu evento <strong>"${eventTitle}"</strong> foi aprovado e já está publicado no <strong>Aonde Tem Baile</strong>!
          </p>

          <!-- Approved Box -->
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #1c1c20; border-radius: 12px; padding: 20px; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 24px;">
            <tr>
              <td>
                <div style="font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Evento em Destaque:
                </div>
                <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">
                  "${eventTitle}"
                </div>
                
                <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 12px 14px; border-radius: 6px;">
                  <span style="font-size: 13px; color: #d1fae5;">
                    <strong>Status:</strong> <span style="color: #10b981; font-weight: 800;">Publicado e Ativo no Site</span>
                  </span>
                </div>
              </td>
            </tr>
          </table>

          <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            💡 <strong>Dica do Produtor:</strong> Compartilhe o link do evento no seu WhatsApp, Instagram e redes sociais para atrair ainda mais público!
          </p>

          <!-- CTA Button -->
          <div style="text-align: center;">
            <a href="${SITE_URL}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);">
              ✨ Ver Evento no Site
            </a>
          </div>
        `)
      : getEmailWrapper(`
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #ef4444; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
              ⚠️ Evento Precisa de Ajustes
            </span>
          </div>

          <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; text-align: center;">
            Atualização sobre seu evento
          </h1>

          <p style="font-size: 15px; color: #d1d5db; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
            Olá <strong>${producerName}</strong>, o evento <strong>"${eventTitle}"</strong> não pôde ser aprovado neste momento.
          </p>

          <!-- Rejected Reason Box -->
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #1c1c20; border-radius: 12px; padding: 20px; border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 24px;">
            <tr>
              <td>
                <div style="font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Evento:
                </div>
                <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 14px;">
                  "${eventTitle}"
                </div>
                
                ${
                  rejectionReason
                    ? `<div style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; padding: 14px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #fca5a5; font-weight: 700; margin-bottom: 4px;">Motivo informado pela moderação:</div>
                        <div style="font-size: 14px; color: #fee2e2;">${rejectionReason}</div>
                       </div>`
                    : ''
                }
              </td>
            </tr>
          </table>

          <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            Você pode corrigir ou atualizar as informações no seu painel e submeter o evento novamente para aprovação.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center;">
            <a href="${SITE_URL}/produtor/dashboard" style="background: #ef4444; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 13px 26px; border-radius: 10px; display: inline-block;">
              ✏️ Ajustar Evento no Painel
            </a>
          </div>
        `);

    const data = await getResendClient().emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar e-mail de alteração de status:', error);
    return { success: false, error };
  }
}
