import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
}; // to prevent multiple instances of PrismaClient in development 

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
} // to prevent multiple instances of PrismaClient in development 

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;