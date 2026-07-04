export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { apiHandler } from '@/lib/apiHandler';
import { ok } from '@/lib/response';
import { AppError } from '@/lib/AppError';
import { getAuthUser } from '@/lib/auth';
import { buildToolsForRole, executeAiTool } from '@/lib/ai-tools';

const MODEL = 'claude-sonnet-5';
const MAX_TOOL_ITERATIONS = 5;

function buildSystemPrompt(roleLabel: string): string {
  const bugun = new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  return `Siz "M-T Transport" avtopark boshqaruv tizimining ichki AI yordamchisisiz.
Bugungi sana: ${bugun}. Foydalanuvchining roli: ${roleLabel}.

Qoidalar:
- Faqat sizga berilgan tool'lar orqali olingan ma'lumotga asoslanib javob bering — hech qachon raqamlarni o'zingiz to'qimang.
- "Bu oy", "o'tgan hafta" kabi vaqt oralig'ini o'zingiz aniq sanaga (YYYY-MM-DD) hisoblab, tool chaqirig'ida shuni ishlating.
- UZS va USD summalarini HECH QACHON qo'shib yubormang — har doim alohida-alohida ayting (4-qoida).
- Javobni o'zbek tilida, qisqa va aniq, raqamlarni probel bilan ajratib (masalan 1 250 000) bering.
- Agar so'ralgan ma'lumot uchun tool mavjud bo'lmasa (masalan foydalanuvchi roliga ruxsat yo'q), buni ochiq ayting: "Bu ma'lumotni ko'rish huquqingiz yo'q".
- Taxmin qilmang — agar tool natijasi bo'sh bo'lsa, shuni ayting.`;
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getAuthUser(req);

  const body = await req.json();
  const savol = typeof body?.savol === 'string' ? body.savol.trim() : '';
  if (!savol) throw AppError.badRequest("Savol matni bo'sh bo'lishi mumkin emas");
  if (savol.length > 500) throw AppError.badRequest("Savol juda uzun (maksimal 500 belgi)");

  if (!process.env.ANTHROPIC_API_KEY) {
    throw AppError.badRequest('AI yordamchi hali sozlanmagan (ANTHROPIC_API_KEY yo\'q)');
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tools = buildToolsForRole(user.rol);
  const roleLabels: Record<string, string> = {
    FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
  };

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: savol }];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(roleLabels[user.rol] || user.rol),
      tools: tools.length ? tools : undefined,
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      return ok({ javob: textBlock?.text || "Javob topilmadi." });
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        try {
          const result = await executeAiTool(block.name, block.input, user.rol);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result).slice(0, 8000),
          });
        } catch (e) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Xato: ${e instanceof Error ? e.message : "noma'lum xato"}`,
            is_error: true,
          });
        }
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return ok({ javob: "Kechirasiz, savolga javob topa olmadim. Iltimos, savolni soddaroq shaklda qayta yozib ko'ring." });
});
