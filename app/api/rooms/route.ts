import prisma from "@/db"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import axios from "axios"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const id = searchParams.get("id")
    const my = searchParams.get("my")
    const location = searchParams.get("location")
    const category = searchParams.get("category")
    const q = searchParams.get("q")

    const session = await getServerSession(authOptions)

    if (id) {
      // 상세 페이지 로직
      const roomId = parseInt(id)
      if (isNaN(roomId)) {
        return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
      }

      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
        },
        include: {
          likes: {
            where: session ? { userId: session.user.id } : {},
          },
          comments: true,
        },
      })

      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
      }

      return NextResponse.json(room, { status: 200 })
    } else if (my) {
      // 내가 등록한 숙소 무한 스크롤 로직
      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized user" },
          { status: 401 },
        )
      }

      const count = await prisma.room.count({
        where: {
          userId: session.user.id,
        },
      })

      const rooms = await prisma.room.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          userId: session.user.id,
          title: q ? { contains: q } : {},
        },
        take: limit,
        skip: (page - 1) * limit,
      })

      return NextResponse.json(
        {
          page,
          data: rooms,
          totalCount: count,
          totalPage: Math.ceil(count / limit),
        },
        { status: 200 },
      )
    } else if (page) {
      // 무한 스크롤 로직 (메인 페이지)
      const count = await prisma.room.count()
      const rooms = await prisma.room.findMany({
        where: {
          address: location ? { contains: location } : {},
          category: category || undefined,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      })

      return NextResponse.json(
        {
          page,
          data: rooms,
          totalCount: count,
          totalPage: Math.ceil(count / limit),
        },
        { status: 200 },
      )
    } else {
      const data = await prisma.room.findMany()
      return NextResponse.json(data, { status: 200 })
    }
  } catch (error) {
    console.error("GET error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized user" }, { status: 401 })
    }

    const formData = await req.json()
    const headers = {
      Authorization: `KakaoAK ${process.env.KAKAO_CLIENT_ID}`,
    }

    const { data } = await axios.get(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURI(formData.address)}`,
      { headers },
    )

    if (!data.documents || data.documents.length === 0) {
      return NextResponse.json(
        { error: "No location data found" },
        { status: 400 },
      )
    }

    const result = await prisma.room.create({
      data: {
        ...formData,
        price: parseInt(formData.price),
        userId: session.user.id,
        lat: data.documents[0].y,
        lng: data.documents[0].x,
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("POST error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized user" }, { status: 401 })
    }

    const roomId = parseInt(id || "")
    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
    }

    const formData = await req.json()
    const headers = {
      Authorization: `KakaoAK ${process.env.KAKAO_CLIENT_ID}`,
    }

    const { data } = await axios.get(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURI(formData.address)}`,
      { headers },
    )

    if (!data.documents || data.documents.length === 0) {
      return NextResponse.json(
        { error: "No location data found" },
        { status: 400 },
      )
    }

    const result = await prisma.room.update({
      where: {
        id: roomId,
      },
      data: {
        ...formData,
        price: parseInt(formData.price),
        userId: session.user.id,
        lat: data.documents[0].y,
        lng: data.documents[0].x,
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("PATCH error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized user" }, { status: 401 })
    }

    const roomId = parseInt(id || "")
    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
    }

    const result = await prisma.room.delete({
      where: {
        id: roomId,
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("DELETE error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}
