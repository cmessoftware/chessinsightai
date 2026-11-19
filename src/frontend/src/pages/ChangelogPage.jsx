import { useMemo } from 'react'
import changelogText from '../../../../CHANGELOG.md?raw'
import ParsedMarkdownDoc from '../components/shared/ParsedMarkdownDoc.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { changelogMarkdownForViewer, isChangelogAdmin } from '../utils/changelogDisplay.js'

/** FEAT-111: the beta label opens this document, rendered from CHANGELOG.md. */
export default function ChangelogPage() {
    const { user, loading, hasPermission } = useAuth()
    const showAdminRoadmapLink = !loading && isChangelogAdmin(user, hasPermission)
    const markdown = useMemo(
        () => changelogMarkdownForViewer(changelogText, { showAdminRoadmapLink }),
        [showAdminRoadmapLink],
    )
    return <ParsedMarkdownDoc markdown={markdown} />
}