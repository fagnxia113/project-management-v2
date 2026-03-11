import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

const ProjectListPage = lazy(() => import('../../pages/projects/ProjectListPage'))
const ProjectCreatePage = lazy(() => import('../../pages/projects/ProjectCreatePage'))
const ProjectDetailPage = lazy(() => import('../../pages/projects/ProjectDetailPage'))
const ProjectCompletionPage = lazy(() => import('../../pages/projects/ProjectCompletionPage'))

export const projectRoutes: RouteObject[] = [
    { path: '/projects', element: <ProjectListPage /> },
    { path: '/projects/create', element: <ProjectCreatePage /> },
    { path: '/projects/:id', element: <ProjectDetailPage /> },
    { path: '/projects/completion', element: <ProjectCompletionPage /> }
]
