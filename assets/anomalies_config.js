// Camera & Anomaly Definitions for 'Ik ben op conciërge dienst'
// Purely real preloaded images + lighting anomalies + camera noise.

const CAMERAS_CONFIG = [
    {
        id: 'cam1',
        number: 'CAM 01',
        name: 'Kluisjeshal',
        code: 'HAL-KL-01',
        fullTitle: 'CAM 01 // KLUISJESHAL & TRAP OOST',
        src: 'assets/cameras/cam1_lockers.jpg',
        anomalies: [
            {
                id: 'cam1_teacher_real',
                type: 'teacher',
                name: 'Docent achter de kluisjes',
                description: 'Een docent gluurt stilletjes om het kluisjesblok heen!',
                targetRoom: 'cam1',
                targetCategory: 'teacher',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam1_lockers_teacher.jpg'
                }
            },
            {
                id: 'cam1_teacher_closeup',
                type: 'teacher',
                name: 'Docent vlak voor de lens',
                description: 'Een docent staat levensgroot vlak voor de beveiligingscamera recht in de lens te kijken!',
                targetRoom: 'cam1',
                targetCategory: 'teacher',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam1_lockers_teacher_closeup.jpg'
                }
            },
            {
                id: 'cam1_lockers_opened',
                type: 'displacement',
                name: 'Alle kluisdeuren staan open',
                description: 'Alle kluisdeuren zijn plotseling wijdbeens opengeslagen!',
                targetRoom: 'cam1',
                targetCategory: 'displacement',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam1_lockers_open.jpg'
                }
            },
            {
                id: 'cam1_light_flicker',
                type: 'light',
                name: 'Knipperende tl-verlichting',
                description: 'De plafondlampen van de kluisjeshal knipperen hevig.',
                targetRoom: 'cam1',
                targetCategory: 'light',
                renderData: {
                    kind: 'flicker'
                }
            },
            {
                id: 'cam1_blackout',
                type: 'light',
                name: 'Plotselinge stroomuitval kluisjeshal',
                description: 'De hal is plotseling aardedonker geworden.',
                targetRoom: 'cam1',
                targetCategory: 'light',
                renderData: {
                    kind: 'blackout',
                    tint: 'rgba(4, 15, 8, 0.95)'
                }
            },
            {
                id: 'cam1_camera_noise',
                type: 'camera',
                name: 'Sensorstoring kluisjeshal',
                description: 'Zware analoge ruis en beeldverstoring op CAM 01.',
                targetRoom: 'cam1',
                targetCategory: 'camera',
                renderData: {
                    kind: 'distortion'
                }
            }
        ]
    },
    {
        id: 'cam2',
        number: 'CAM 02',
        name: 'Fietsenstalling',
        code: 'EXT-FT-02',
        fullTitle: 'CAM 02 // FIETSENSTALLING EXTERIEUR',
        src: 'assets/cameras/cam2_bikes.jpg',
        anomalies: [
            {
                id: 'cam2_bikes_missing',
                type: 'displacement',
                name: 'Alle fietsen zijn verdwenen',
                description: 'De honderden geparkeerde fietsen zijn plotseling in het niets opgelost!',
                targetRoom: 'cam2',
                targetCategory: 'displacement',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam2_bikes_empty.jpg'
                }
            },
            {
                id: 'cam2_containers_replaced',
                type: 'displacement',
                name: 'Containers vervangen door fietsenrekken',
                description: 'De witte containers rechtsachter zijn verdwenen en vervangen door fietsenrekken!',
                targetRoom: 'cam2',
                targetCategory: 'displacement',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam2_bikes_no_containers.jpg'
                }
            },
            {
                id: 'cam2_light_flicker',
                type: 'light',
                name: 'Knipperende terreinverlichting',
                description: 'De schijnwerpers van de fietsenstalling knipperen hevig.',
                targetRoom: 'cam2',
                targetCategory: 'light',
                renderData: {
                    kind: 'flicker'
                }
            },
            {
                id: 'cam2_blackout',
                type: 'light',
                name: 'Nachtelijke duisternis buitenterrein',
                description: 'Het hele buitenterrein valt plotseling in pikdonkere duisternis.',
                targetRoom: 'cam2',
                targetCategory: 'light',
                renderData: {
                    kind: 'blackout',
                    tint: 'rgba(3, 6, 16, 0.93)'
                }
            },
            {
                id: 'cam2_camera_noise',
                type: 'camera',
                name: 'Transmissiefout buitencamera',
                description: 'Horizontale signaalverschuivingen op CAM 02.',
                targetRoom: 'cam2',
                targetCategory: 'camera',
                renderData: {
                    kind: 'distortion'
                }
            }
        ]
    },
    {
        id: 'cam3',
        number: 'CAM 03',
        name: 'Bakstenen Gang',
        code: 'VLG-B-03',
        fullTitle: 'CAM 03 // HISTORISCHE GANG VLEUGEL B',
        src: 'assets/cameras/cam3_hallway.jpg',
        anomalies: [
            {
                id: 'cam3_teacher_real',
                type: 'teacher',
                name: 'Docent om de bakstenen muur',
                description: 'Een docent gluurt om de bakstenen muur links in de gang!',
                targetRoom: 'cam3',
                targetCategory: 'teacher',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam3_hallway_teacher.jpg'
                }
            },
            {
                id: 'cam3_door_opened',
                type: 'displacement',
                name: 'Lokaaldeur staat open',
                description: 'De witte kantoordeur aan de rechterkant staat plotseling wagenwijd open in de gang!',
                targetRoom: 'cam3',
                targetCategory: 'displacement',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam3_hallway_door_open.jpg'
                }
            },
            {
                id: 'cam3_firehose_missing',
                type: 'displacement',
                name: 'Brandhaspel is verdwenen',
                description: 'De rode brandslanghaspel aan de rechter bakstenen muur is spoorloos verdwenen!',
                targetRoom: 'cam3',
                targetCategory: 'displacement',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam3_hallway_no_firehose.jpg'
                }
            },
            {
                id: 'cam3_light_flicker',
                type: 'light',
                name: 'Knipperende hanglampen',
                description: 'De grote hanglampen aan het plafond knipperen onrustig.',
                targetRoom: 'cam3',
                targetCategory: 'light',
                renderData: {
                    kind: 'flicker'
                }
            },
            {
                id: 'cam3_blackout',
                type: 'light',
                name: 'Totale blackout bakstenen gang',
                description: 'Alle verlichting in gang B valt uit, enkel het noodalarm gloeit.',
                targetRoom: 'cam3',
                targetCategory: 'light',
                renderData: {
                    kind: 'blackout',
                    tint: 'rgba(8, 4, 4, 0.95)'
                }
            },
            {
                id: 'cam3_camera_noise',
                type: 'camera',
                name: 'Cameraruis bakstenen gang',
                description: 'Signaalinterferentie op CAM 03.',
                targetRoom: 'cam3',
                targetCategory: 'camera',
                renderData: {
                    kind: 'distortion'
                }
            }
        ]
    },
    {
        id: 'cam4',
        number: 'CAM 04',
        name: 'Centrale Trap',
        code: 'AUL-TR-04',
        fullTitle: 'CAM 04 // CENTRALE TRAP & GLAS-IN-LOOD',
        src: 'assets/cameras/cam4_stairs.jpg',
        anomalies: [
            {
                id: 'cam4_teacher_window',
                type: 'teacher',
                name: 'Docent in de bovenkamer',
                description: 'Een docent staat voor het raam van de bovenverdieping naar de aula te kijken!',
                targetRoom: 'cam4',
                targetCategory: 'teacher',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam4_stairs_teacher.jpg'
                }
            },
            {
                id: 'cam4_teacher_balcony',
                type: 'teacher',
                name: 'Docent op de balustrade',
                description: 'Een docent staat bovenaan bij de witte balustrade over de reling naar beneden te kijken!',
                targetRoom: 'cam4',
                targetCategory: 'teacher',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam4_stairs_teacher_balcony.jpg'
                }
            },
            {
                id: 'cam4_windows_missing',
                type: 'displacement',
                name: 'Glas-in-loodramen verdwenen',
                description: 'De drie monumentale glas-in-loodramen rechts zijn spoorloos verdwenen en dichtgemetseld!',
                targetRoom: 'cam4',
                targetCategory: 'displacement',
                renderData: {
                    kind: 'swap_image',
                    imageSrc: 'assets/cameras/cam4_stairs_no_windows.jpg'
                }
            },
            {
                id: 'cam4_light_flicker',
                type: 'light',
                name: 'Knipperende aula-spotlights',
                description: 'De verlichting rond de centrale trap knippert onheilspellend.',
                targetRoom: 'cam4',
                targetCategory: 'light',
                renderData: {
                    kind: 'flicker'
                }
            },
            {
                id: 'cam4_blackout',
                type: 'light',
                name: 'Duisternis bij de trap',
                description: 'De centrale hal is donker, enkel het glas-in-lood weerkaatst spookachtig.',
                targetRoom: 'cam4',
                targetCategory: 'light',
                renderData: {
                    kind: 'blackout',
                    tint: 'rgba(6, 4, 15, 0.93)'
                }
            },
            {
                id: 'cam4_camera_noise',
                type: 'camera',
                name: 'Interferentie aula camera',
                description: 'Zware synchronisatiefout op CAM 04.',
                targetRoom: 'cam4',
                targetCategory: 'camera',
                renderData: {
                    kind: 'distortion'
                }
            }
        ]
    }
];

// Clean report categories matching the streamlined gameplay
const ANOMALY_CATEGORIES = [
    { id: 'teacher', name: 'Docent / Indringer', icon: '👩‍🏫', desc: 'Verschijning van een docent in de ruimte' },
    { id: 'displacement', name: 'Missend / Verplaatst Object', icon: '🚪', desc: 'Objecten die verplaatst, geopend of verdwenen zijn' },
    { id: 'light', name: 'Lichtstoring / Blackout', icon: '💡', desc: 'Knipperende verlichting of aardedonkere ruimte' },
    { id: 'camera', name: 'Camerastoring', icon: '📺', desc: 'Zware ruis, synchronisatiefout of signaalstoring' }
];

window.CAMERAS_CONFIG = CAMERAS_CONFIG;
window.ANOMALY_CATEGORIES = ANOMALY_CATEGORIES;
