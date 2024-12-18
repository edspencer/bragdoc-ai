import { NextResponse } from "next/server";
import { auth } from '@/app/(auth)/auth';
import {
  getCompanyById,
  updateCompany,
  deleteCompany
} from "@/lib/db/queries";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { db } from "@/lib/db";

// Validation schema for updating a company
const updateCompanySchema = z.object({
  name: z.string().min(1).max(256).optional(),
  domain: z.string().max(256).nullable().optional(),
  role: z.string().min(1).max(256).optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().nullable().transform((str) => str ? new Date(str) : null).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await getCompanyById({
      id: params.id,
      userId: session.user.id,
      db
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Failed to get company:", error);
    return NextResponse.json(
      { error: "Failed to get company" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    const [company] = await updateCompany({
      id: params.id,
      userId: session.user.id,
      data: validatedData,
      db
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Failed to update company:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deleteCompany({
      id: params.id,
      userId: session.user.id,
      db
    });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
