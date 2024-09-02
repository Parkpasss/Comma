import prisma from "@/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const data = await prisma.faq.findMany()

    return NextResponse.json(data, {
      status: 200,
    })
  } catch (error) {
    console.error("Error fetching FAQs:", error)
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 })
  }
}
