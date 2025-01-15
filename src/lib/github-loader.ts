import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import { Document } from '@langchain/core/documents';
import { generateEmbedding, summariseCode } from './gemini';
import { db } from '@/server/db';
import axios from 'axios';

const getDefaultBranch = async (githubUrl: string, githubToken?: string): Promise<string> => {
    const repoPath = githubUrl.replace('https://github.com/', '');
    const apiUrl = `https://api.github.com/repos/${repoPath}`;
    const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};

    const response = await axios.get(apiUrl, { headers });
    return response.data.default_branch;
};

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const defaultBranch = await getDefaultBranch(githubUrl, githubToken);
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || "",
        branch: defaultBranch,
        ignoreFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5
    })

    const docs = await loader.load();
    return docs;
};

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs);
    await Promise.allSettled(allEmbeddings.map(async (embedding, index) => {
        console.log(`Processing ${index} of ${allEmbeddings.length}`);
        if (!embedding) return;

        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
                summary: embedding.summary,
                sourceCode: embedding.sourceCode,
                fileName: embedding.fileName,
                projectId
            }
        });

        await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding}::vector
        WHERE "id" = ${sourceCodeEmbedding.id}
        `

    }))
};

const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async doc => {
        const summary = await summariseCode(doc);
        const embedding = await generateEmbedding(summary);
        return {
            summary, 
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source
        }
    }))
}