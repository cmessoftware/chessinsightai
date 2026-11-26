import { useState } from 'react'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import {
    Box,
    Chip,
    CircularProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from '@mui/material'
import {
    FEEDBACK_WORKFLOW_STATUSES,
    workflowStatusMeta,
} from '../../utils/feedbackWorkflowStatus.js'

function StatusGlyph({ statusId, size = 18 }) {
    const sx = { fontSize: size }
    switch (statusId) {
        case 'backlog':
            return (
                <Box sx={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
                    <PanoramaFishEyeIcon sx={{ ...sx, color: 'success.main' }} />
                    <FiberManualRecordIcon
                        sx={{
                            fontSize: size * 0.42,
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'success.main',
                        }}
                    />
                </Box>
            )
        case 'todo':
            return <PanoramaFishEyeIcon sx={{ ...sx, color: 'success.main' }} />
        case 'in_progress':
            return <RadioButtonCheckedIcon sx={{ ...sx, color: 'success.main', opacity: 0.65 }} />
        case 'in_review':
            return <RadioButtonCheckedIcon sx={{ ...sx, color: 'success.main' }} />
        case 'done':
            return <CheckCircleIcon sx={{ ...sx, color: 'secondary.main' }} />
        case 'not_planned':
        case 'duplicate':
            return <DoNotDisturbOnOutlinedIcon sx={{ ...sx, color: 'text.disabled' }} />
        default:
            return <PanoramaFishEyeIcon sx={sx} />
    }
}

/**
 * Selector de estado tipo GitHub Projects — solo admin de plataforma (FEAT-124 ext.).
 */
export function FeedbackIssueWorkflowMenu({
    workflowStatus = 'todo',
    disabled = false,
    loading = false,
    onSelect,
}) {
    const [anchor, setAnchor] = useState(null)
    const meta = workflowStatusMeta(workflowStatus)
    const open = Boolean(anchor)

    const trigger = (
        <Chip
            size="small"
            clickable={!disabled && !loading}
            onClick={(e) => {
                if (disabled || loading) return
                setAnchor(e.currentTarget)
            }}
            icon={<StatusGlyph statusId={workflowStatus} />}
            label={
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                    {meta.label}
                    {!disabled && <ArrowDropDownIcon sx={{ fontSize: 18, ml: -0.25 }} />}
                </Box>
            }
            color={meta.chipColor}
            variant={workflowStatus === 'done' ? 'filled' : 'outlined'}
            disabled={disabled}
            sx={{
                height: 28,
                '& .MuiChip-icon': { ml: 0.75 },
                ...(workflowStatus === 'done' && {
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    '& .MuiChip-icon': { color: 'inherit' },
                }),
            }}
        />
    )

    return (
        <>
            {loading ? (
                <Chip
                    size="small"
                    label={meta.label}
                    icon={<CircularProgress size={14} color="inherit" />}
                    variant="outlined"
                />
            ) : (
                trigger
            )}
            <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)} PaperProps={{ sx: { minWidth: 220 } }}>
                {FEEDBACK_WORKFLOW_STATUSES.map((item) => {
                    const selected = item.id === workflowStatus
                    return (
                        <MenuItem
                            key={item.id}
                            selected={selected}
                            onClick={() => {
                                setAnchor(null)
                                if (item.id !== workflowStatus) onSelect?.(item.id)
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                <StatusGlyph statusId={item.id} />
                            </ListItemIcon>
                            <ListItemText primary={item.label} />
                            {selected && (
                                <CheckIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                            )}
                        </MenuItem>
                    )
                })}
            </Menu>
        </>
    )
}

/** Chip de solo lectura para usuarios sin permiso de cambio. */
export function FeedbackIssueWorkflowChip({ workflowStatus = 'todo', workflowLabel }) {
    const meta = workflowStatusMeta(workflowStatus)
    const label = workflowLabel || meta.label
    return (
        <Chip
            size="small"
            icon={<StatusGlyph statusId={workflowStatus} />}
            label={label}
            color={meta.chipColor}
            variant={workflowStatus === 'done' ? 'filled' : 'outlined'}
            sx={{
                height: 28,
                '& .MuiChip-icon': { ml: 0.75 },
                ...(workflowStatus === 'done' && {
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                }),
            }}
        />
    )
}