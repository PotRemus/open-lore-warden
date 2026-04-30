import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import TablePage from '@/pages/TablePage.vue'
import ScenePage from '@/pages/ScenePage.vue'
import CharactersPage from '@/pages/CharactersPage.vue'
import JournalPage from '@/pages/JournalPage.vue'
import ImportPage from '@/pages/ImportPage.vue'
import ImportResultPage from '@/pages/ImportResultPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import TestPage from '@/pages/TestPage.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/home',
            name: 'home',
            component: HomePage,
        },
        {
            path: '/table',
            name: 'tableview',
            component: TablePage,
        },
        {
            path: '/scene',
            name: 'scene',
            component: ScenePage,
        },
        {
            path: '/characters',
            name: 'characters',
            component: CharactersPage,
        },
        {
            path: '/journal',
            name: 'journal',
            component: JournalPage,
        },
        {
            path: '/import',
            name: 'import',
            component: ImportPage,
        },
        {
            path: '/import/:campaignId',
            name: 'import-result',
            component: ImportResultPage,
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsPage,
        },
        { 
            path: '/',
            name: 'test',
            component: TestPage,
        },
    ],
})

export default router
