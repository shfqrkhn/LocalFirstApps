export const EXERCISES = [
    {
        id: 'hinge', name: 'Trap Bar Deadlift', category: 'HINGE', sets: 3, reps: 8,
        video: 'https://www.youtube.com/results?search_query=trap+bar+deadlift+form+tutorial',
        alternatives: ['Barbell RDL', 'DB RDL'],
        altLinks: {
            'Barbell RDL': 'https://www.youtube.com/results?search_query=barbell+romanian+deadlift+form',
            'DB RDL': 'https://www.youtube.com/results?search_query=dumbbell+romanian+deadlift+form'
        }
    },
    {
        id: 'knee', name: 'Goblet Squat', category: 'KNEE', sets: 3, reps: 10,
        video: 'https://www.youtube.com/results?search_query=dumbbell+goblet+squat+form',
        alternatives: ['DB Front Squat', 'Bulgarian Split Squat'],
        altLinks: {
            'DB Front Squat': 'https://www.youtube.com/results?search_query=dumbbell+front+squat+form',
            'Bulgarian Split Squat': 'https://www.youtube.com/results?search_query=bulgarian+split+squat+dumbbells+form'
        }
    },
    {
        id: 'push_horz', name: 'DB Bench Press', category: 'H-PUSH', sets: 3, reps: 10,
        video: 'https://www.youtube.com/results?search_query=dumbbell+bench+press+form',
        alternatives: ['Barbell Bench Press', 'Incline Push-up on Bench'],
        altLinks: {
            'Barbell Bench Press': 'https://www.youtube.com/results?search_query=barbell+bench+press+form',
            'Incline Push-up on Bench': 'https://www.youtube.com/results?search_query=hands+elevated+push+up+on+bench+form'
        }
    },
    {
        id: 'push_incline', name: 'Incline DB Press', category: 'H-PUSH', sets: 3, reps: 10,
        video: 'https://www.youtube.com/results?search_query=incline+dumbbell+press+form',
        alternatives: ['Incline Barbell Press', 'Decline Push-up'],
        altLinks: {
            'Incline Barbell Press': 'https://www.youtube.com/results?search_query=incline+barbell+bench+press+form',
            'Decline Push-up': 'https://www.youtube.com/results?search_query=decline+push+up+form'
        }
    },
    {
        id: 'push_vert', name: 'Standing DB OHP', category: 'V-PUSH', sets: 3, reps: 10,
        video: 'https://www.youtube.com/results?search_query=standing+dumbbell+overhead+press+form',
        alternatives: ['Seated DB Press', 'Barbell Overhead Press'],
        altLinks: {
            'Seated DB Press': 'https://www.youtube.com/results?search_query=seated+dumbbell+shoulder+press+form',
            'Barbell Overhead Press': 'https://www.youtube.com/results?search_query=standing+barbell+overhead+press+form'
        }
    },
    {
        id: 'pull', name: 'Chest-Supported Row', category: 'PULL', sets: 3, reps: 12,
        video: 'https://www.youtube.com/results?search_query=incline+bench+dumbbell+row+form',
        alternatives: ['Single Arm DB Row (Bench)', 'Barbell Row'],
        altLinks: {
            'Single Arm DB Row (Bench)': 'https://www.youtube.com/results?search_query=single+arm+dumbbell+row+on+bench+form',
            'Barbell Row': 'https://www.youtube.com/results?search_query=barbell+bent+over+row+form'
        }
    },
    {
        id: 'pull_vert', name: 'Lat Pulldown', category: 'PULL', sets: 3, reps: 12,
        video: 'https://www.youtube.com/results?search_query=lat+pulldown+form',
        alternatives: ['Pull Up', 'Band Pulldown'],
        altLinks: {
            'Pull Up': 'https://www.youtube.com/results?search_query=pull+up+form',
            'Band Pulldown': 'https://www.youtube.com/results?search_query=resistance+band+lat+pulldown'
        }
    },
    {
        id: 'carry', name: 'Farmers Walk', category: 'CARRY', sets: 3, reps: 40,
        video: 'https://www.youtube.com/results?search_query=farmers+walk+dumbbell+form',
        alternatives: ['Farmer Hold (Standing)', 'DB Shrugs'],
        altLinks: {
            'Farmer Hold (Standing)': 'https://www.youtube.com/results?search_query=farmers+hold+exercise+form',
            'DB Shrugs': 'https://www.youtube.com/results?search_query=standing+dumbbell+shrugs+form'
        }
    },
    {
        id: 'calves', name: 'Standing Calf Raises', category: 'CALVES', sets: 3, reps: 15,
        video: 'https://www.youtube.com/results?search_query=standing+dumbbell+calf+raise+form',
        alternatives: ['Seated Calf Raises', 'Jump Rope'],
        altLinks: {
            'Seated Calf Raises': 'https://www.youtube.com/results?search_query=seated+dumbbell+calf+raise+form',
            'Jump Rope': 'https://www.youtube.com/results?search_query=jump+rope+boxing+technique'
        }
    }
];

export const WARMUP = [
    { 
        id: 'thoracic', name: 'Wall Thoracic Rotations', reps: '10/side', 
        video: 'https://www.youtube.com/results?search_query=standing+thoracic+rotation+against+wall',
        alternatives: ['Standing Windmill', 'Standing T-Spine Twist'],
        altLinks: {
            'Standing Windmill': 'https://www.youtube.com/results?search_query=standing+windmill+exercise+form',
            'Standing T-Spine Twist': 'https://www.youtube.com/results?search_query=standing+t-spine+rotation+form'
        }
    },
    { 
        id: 'swings', name: 'Kettlebell Swings', reps: '20', 
        video: 'https://www.youtube.com/results?search_query=russian+kettlebell+swing+form',
        alternatives: ['Broad Jumps', 'Bodyweight Good Mornings'],
        altLinks: {
            'Broad Jumps': 'https://www.youtube.com/results?search_query=broad+jump+form',
            'Bodyweight Good Mornings': 'https://www.youtube.com/results?search_query=bodyweight+good+morning+exercise'
        }
    },
    { 
        id: 'halo', name: 'Standing KB Halo', reps: '10/dir', 
        video: 'https://www.youtube.com/results?search_query=standing+kettlebell+halo+exercise',
        alternatives: ['Around the World (Plate/DB)', 'Shoulder Dislocates (Broom)'],
        altLinks: {
            'Around the World (Plate/DB)': 'https://www.youtube.com/results?search_query=plate+around+the+world+exercise',
            'Shoulder Dislocates (Broom)': 'https://www.youtube.com/results?search_query=shoulder+dislocates+form'
        }
    },
    { 
        id: 'prying', name: 'Goblet Squat Prying', reps: '10', 
        video: 'https://www.youtube.com/results?search_query=goblet+squat+prying+stretch',
        alternatives: ['Cossack Squat', 'Deep Squat Hold'],
        altLinks: {
            'Cossack Squat': 'https://www.youtube.com/results?search_query=cossack+squat+form',
            'Deep Squat Hold': 'https://www.youtube.com/results?search_query=deep+squat+hold+mobility'
        }
    },
    { 
        id: 'rope', name: 'Jump Rope', reps: '100', 
        video: 'https://www.youtube.com/results?search_query=jump+rope+basic+bounce',
        alternatives: ['Jumping Jacks', 'High Knees'],
        altLinks: {
            'Jumping Jacks': 'https://www.youtube.com/results?search_query=jumping+jacks+form',
            'High Knees': 'https://www.youtube.com/results?search_query=high+knees+exercise+form'
        }
    }
];

export const CARDIO_OPTIONS = [
    { name: 'Assault Bike', video: 'https://www.youtube.com/results?search_query=assault+bike+technique' },
    { name: 'Rower', video: 'https://www.youtube.com/results?search_query=concept2+rowing+technique' },
    { name: 'Treadmill Incline', video: 'https://www.youtube.com/results?search_query=treadmill+incline+walking+form' }
];

export const DECOMPRESSION = [
    {
        id: 'hang', name: 'Dead Hang',
        video: 'https://www.youtube.com/results?search_query=dead+hang+form',
        alternatives: ['Farmers Hold (Static)', 'Plate Pinch Hold'],
        altLinks: {
            'Farmers Hold (Static)': 'https://www.youtube.com/results?search_query=farmers+hold+exercise',
            'Plate Pinch Hold': 'https://www.youtube.com/results?search_query=plate+pinch+grip+hold'
        },
        inputLabel: 'Seconds',
        duration: '30-60 seconds • Relax shoulders, decompress spine'
    },
    {
        id: 'breath', name: 'Box Breathing (Seated)',
        video: 'https://www.youtube.com/results?search_query=seated+box+breathing+technique',
        alternatives: ['Physiological Sigh', '4-7-8 Breathing'],
        altLinks: {
            'Physiological Sigh': 'https://www.youtube.com/results?search_query=physiological+sigh+breathing',
            '4-7-8 Breathing': 'https://www.youtube.com/results?search_query=4-7-8+breathing+technique'
        },
        inputLabel: null,
        duration: '4 rounds • 4s inhale, 4s hold, 4s exhale, 4s hold'
    }
];

export const RECOVERY_CONFIG = {
    green: { label: 'Green', factor: 1.0 },
    yellow: { label: 'Yellow', factor: 0.9 },
    red: { label: 'Red', factor: 0 }
};
// Optimization: Pre-calculated Maps for O(1) lookups
export const EXERCISE_MAP = new Map(EXERCISES.map(e => [e.id, e]));
export const WARMUP_MAP = new Map(WARMUP.map(e => [e.id, e]));
export const DECOMPRESSION_MAP = new Map(DECOMPRESSION.map(e => [e.id, e]));
