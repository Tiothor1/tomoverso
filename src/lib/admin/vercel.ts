import type { AdminIntegrationRow } from "./types";

type VercelProject = {
  id?: string;
  name?: string;
  framework?: string | null;
  latestDeployments?: Array<{ url?: string | null; state?: string | null; target?: string | null }>;
  alias?: string[];
};

export async function vercelApiJson<T>(pathname: string, token: string, teamId?: string | null): Promise<T> {
  const url = new URL(pathname, "https://api.vercel.com");
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel ${res.status}: ${text.slice(0, 220)}`);
  return JSON.parse(text) as T;
}

export async function fetchVercelIntegrationStatus(integration: AdminIntegrationRow) {
  if (!integration.access_token) {
    return { ok: false, message: "Sem token salvo", project: null, deployment: null };
  }

  const token = integration.access_token;
  const teamId = integration.team_id || null;

  let project: VercelProject | null = null;
  if (integration.project_id) {
    project = await vercelApiJson<VercelProject>(`/v9/projects/${integration.project_id}`, token, teamId);
  } else {
    const all = await vercelApiJson<{ projects: VercelProject[] }>("/v10/projects?limit=100", token, teamId);
    project = (all.projects || []).find((p) => p.name === integration.project_name) || null;
  }

  if (!project?.id) {
    return { ok: false, message: "Projeto não encontrado na Vercel", project: null, deployment: null };
  }

  const deployments = await vercelApiJson<{ deployments: Array<{ uid: string; url: string; state: string; target?: string | null; createdAt?: number }> }>(`/v6/deployments?projectId=${project.id}&limit=1&target=production`, token, teamId);
  return {
    ok: true,
    message: "Integração Vercel ativa",
    project: {
      id: project.id,
      name: project.name || integration.project_name,
      framework: project.framework || null,
      aliases: project.alias || [],
    },
    deployment: deployments.deployments?.[0] || null,
  };
}

export function maskToken(token: string | null | undefined) {
  if (!token) return null;
  if (token.length <= 8) return "••••••••";
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}
