import { PrismaClient } from './generated/prisma';
const p = new PrismaClient();
p.quote.findMany().then(r => {
    console.log('Total quotes:', r.length);
    r.forEach(q => console.log(q.id, q.content.substring(0, 40)));
}).finally(() => (p as any).$disconnect?.());
