"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormInput = {
    repoUrl: string,
    projectName: string,
    githubToken?: string
}

const CreatePage = () => {
    const { register, handleSubmit, reset } = useForm<FormInput>();
    const createProject = api.project.createProject.useMutation();
    const refetch = useRefetch();

    function onSubmit(data: FormInput) {
        createProject.mutate({
            name: data.projectName,
            githubUrl: data.repoUrl,
            githubToken: data.githubToken
        }, {
            onSuccess: () => {
                toast.success('Project created successfully');
                reset();
                await refetch();  
            },
            onError: () => {
                toast.error('Failed to create project');
            }
        });
        return true;
    }

    return (
        <div className="flex items-center gap-12 h-full justify-center">
            <img src="/createlogo.png" className="h-56 w-auto" />
            <div>
                <div>
                    <h1 className="font-semibold text-2xl">
                        Link your GitHub Repository
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter the URL of your repository to link it to Dionysus
                    </p>
                </div>

                <div className="h-4"></div>

                <div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Input  
                            {...register('projectName', { required: true })}
                            placeholder="Project Name"
                            required
                        />
                        <Input  
                            {...register('repoUrl', { required: true })}
                            placeholder="GitHub URL"
                            required
                        />
                        <Input  
                            {...register('githubToken')}
                            placeholder="GitHub Token (Optional)"
                        />

                        <div className="h-4"></div>
                        <Button type="submit" disabled={createProject.isPending}>
                            Create Project
                        </Button>
                    </form>
                </div>

            </div>
        </div>
    )
}

export default CreatePage;