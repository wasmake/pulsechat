import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  generateChannelId,
  generateToken,
  generateWorkspaceId,
  isEmail,
} from '@/lib/utils';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { id: userId, email: userEmail } = session.user;

  try {
    const body = await request.json();
    const { workspaceName, channelName, emails, imageUrl, accentColor } = body;

    // Validate input
    if (
      !workspaceName ||
      !channelName ||
      (accentColor && !/^#[0-9a-f]{6}$/i.test(accentColor)) ||
      !Array.isArray(emails) ||
      emails.length === 0
    ) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    // Validate emails
    for (const email of emails) {
      if (!isEmail(email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${email}` },
          { status: 400 }
        );
      }
    }

    const { workspace, channel } = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          id: generateWorkspaceId(),
          name: workspaceName,
          image: imageUrl || null,
          accentColor: accentColor || '#4a154b',
          ownerId: userId,
        },
      });
      const channel = await tx.channel.create({
        data: {
          id: generateChannelId(),
          name: channelName,
          workspaceId: workspace.id,
        },
      });
      await tx.membership.create({
        data: {
          userId,
          email: userEmail,
          workspaceId: workspace.id,
          role: 'admin',
        },
      });

      return { workspace, channel };
    });

    // Invite provided emails
    const invitations = [];
    const skippedEmails = [];
    const errors = [];

    for (const email of emails) {
      try {
        // Check if an invitation already exists
        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            email,
            workspaceId: workspace.id,
            acceptedAt: null,
          },
        });

        // check if the user is already a member
        const existingMembership = await prisma.membership.findFirst({
          where: {
            email,
            workspaceId: workspace.id,
          },
        });

        if (existingInvitation) {
          skippedEmails.push(email);
          continue;
        }

        if (existingMembership) {
          skippedEmails.push(email);
          continue;
        }

        if (email === userEmail) {
          skippedEmails.push(email);
          continue;
        }

        // Generate token
        const token = generateToken();

        // Create invitation
        const invitation = await prisma.invitation.create({
          data: {
            email,
            token,
            workspaceId: workspace.id,
            invitedById: userId,
          },
        });

        invitations.push(invitation);
      } catch (error) {
        console.error(`Error inviting ${email}:`, error);
        errors.push({ email, error });
      }
    }

    // Return response
    const response = {
      message: 'Workspace created successfully',
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      channel: {
        id: channel.id,
        name: channelName,
      },
      invitationsSent: invitations.length,
      invitationsSkipped: skippedEmails.length,
      errors,
    };

    if (errors.length > 0) {
      return NextResponse.json(response, { status: 207 });
    } else {
      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
