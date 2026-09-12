import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = 'Aonde Tem Baile <onboarding@resend.dev>'; // Resend default testing domain or custom domain

export async function sendWelcomeEmail(toEmail: string, producerName: string) {
  try {
    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: 'Bem-vindo ao Aonde Tem Baile! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🪩 Aonde Tem Baile</h1>
            <p style="color: #94a3b8; font-size: 14px;">A sua vitrine de eventos regionais pelo Brasil</p>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #ffffff; margin-top: 0;">Olá, ${producerName}!</h2>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Seja muito bem-vindo(a) à nossa plataforma! Sua conta de produtor de eventos foi criada com sucesso.
            </p>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Agora você pode cadastrar seus eventos, festas e bailes para que pessoas da sua região encontrem sua programação facilmente.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://aondetembaile.com.br/produtor/novo-evento" style="background-color: #f59e0b; color: #0f172a; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Cadastrar Meu Primeiro Evento
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center;">
              Caso tenha dúvidas, nossa equipe está sempre à disposição.
            </p>
          </div>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error);
    return { success: false, error };
  }
}

export async function sendEventSubmittedEmail(toEmail: string, producerName: string, eventTitle: string) {
  try {
    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [toEmail],
      subject: `Evento Recebido: ${eventTitle} 📝`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🪩 Aonde Tem Baile</h1>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #ffffff; margin-top: 0;">Evento cadastrado com sucesso!</h2>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Olá <strong>${producerName}</strong>, recebemos o cadastro do seu evento <strong>"${eventTitle}"</strong>.
            </p>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Seu evento está atualmente <strong>em análise pela nossa equipe de moderação</strong>. Assim que for revisado, você receberá uma confirmação por e-mail.
            </p>
            <div style="background-color: #0f172a; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #e2e8f0; font-size: 14px;">
                Status atual: <span style="color: #f59e0b; font-weight: bold;">Pendente de Aprovação</span>
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar e-mail de evento cadastrado:', error);
    return { success: false, error };
  }
}

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
      ? `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🪩 Aonde Tem Baile</h1>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #10b981;">
            <h2 style="color: #10b981; margin-top: 0;">Seu evento foi APROVADO e já está no ar! 🚀</h2>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Parabéns, <strong>${producerName}</strong>! Seu evento <strong>"${eventTitle}"</strong> foi revisado e aprovado.
            </p>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Ele já está disponível no site para todos os usuários da sua região encontrarem e compartilharem.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://aondetembaile.com.br" style="background-color: #10b981; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Ver Evento no Site
              </a>
            </div>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🪩 Aonde Tem Baile</h1>
          </div>
          <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #ef4444;">
            <h2 style="color: #ef4444; margin-top: 0;">Seu evento não foi aprovado</h2>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Olá <strong>${producerName}</strong>, infelizmente o evento <strong>"${eventTitle}"</strong> não atendeu a todos os critérios de publicação.
            </p>
            ${
              rejectionReason
                ? `<div style="background-color: #450a0a; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #fca5a5; font-size: 14px;"><strong>Motivo informado:</strong> ${rejectionReason}</p>
                   </div>`
                : ''
            }
            <p style="color: #cbd5e1; line-height: 1.6;">
              Você pode ajustar as informações necessárias no seu painel e submeter o evento novamente.
            </p>
          </div>
        </div>
      `;

    const data = await resend.emails.send({
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
