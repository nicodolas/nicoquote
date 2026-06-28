import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const quotes = [
    { content: 'Đời ngắn, hãy yêu người thương.', author: 'Nhà thơ', tags: ['tình yêu'] },
    { content: 'Hành động là sức mạnh.', author: 'Chốt gần nhau', tags: ['động lực'] },
    { content: 'Học không bằng mắt. Phải đi đến nơi khác mới biết được gì.', author: 'Trải giác', tags: ['triết học'] },
    { content: 'Sự kiên nhẫn là mẹ của thành công.', author: 'Tục ngữ Việt Nam', tags: ['kiên nhẫn', 'thành công'] },
    { content: 'Đừng đợi cơ hội, hãy tạo ra nó.', author: 'Khuyết danh', tags: ['động lực', 'cơ hội'] },
    { content: 'Thất bại là mẹ thành công.', author: 'Tục ngữ Việt Nam', tags: ['thất bại', 'thành công'] },
    { content: 'Học hỏi không bao giờ là thừa.', author: 'Khuyết danh', tags: ['học tập'] },
    { content: 'Mỗi ngày là một cơ hội mới để bắt đầu lại.', author: 'Khuyết danh', tags: ['hy vọng', 'động lực'] },
];

async function main() {
    const existing = await prisma.quote.count();
    if (existing > 0) {
        console.log(`Seed skipped: ${existing} quote(s) already present.`);
        return;
    }

    await prisma.quote.createMany({ data: quotes });
    console.log(`Seeded ${quotes.length} quotes.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
