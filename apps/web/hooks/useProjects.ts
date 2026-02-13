"use client";

import type { Project } from "@blueflame/shared";
import { useCallback, useEffect, useState } from "react";

import { apiDelete, apiGet, apiPost } from "@/lib/api-client";

interface UseProjectsResult {
	projects: Project[];
	isLoading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	createProject: (name: string, description: string) => Promise<Project>;
	deleteProject: (projectId: string) => Promise<void>;
}

export function useProjects(): UseProjectsResult {
	const [projects, setProjects] = useState<Project[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await apiGet<{ projects: Project[] }>("/api/projects");
			setProjects(data.projects);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load projects");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const createProject = useCallback(
		async (name: string, description: string): Promise<Project> => {
			const data = await apiPost<{ project: Project }>("/api/projects", { name, description });
			await refresh();
			return data.project;
		},
		[refresh],
	);

	const deleteProject = useCallback(
		async (projectId: string): Promise<void> => {
			await apiDelete(`/api/projects/${projectId}`);
			await refresh();
		},
		[refresh],
	);

	return { projects, isLoading, error, refresh, createProject, deleteProject };
}
