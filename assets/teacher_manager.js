// Teacher & Anomaly Image Manager for 'Ik ben op conciërge dienst'
// Only contains the real teacher and allows custom uploads

class TeacherManager {
    constructor() {
        this.storageKey = 'concierge_custom_teachers';
        this.defaultTeachers = [
            {
                id: 'real_teacher',
                name: 'Docent (School)',
                src: 'assets/cameras/cam1_lockers_teacher.jpg',
                isDefault: true
            }
        ];
        this.customTeachers = this.loadCustomTeachers();
    }

    loadCustomTeachers() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('Failed to load custom teachers from localStorage:', e);
            return [];
        }
    }

    saveCustomTeachers() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.customTeachers));
        } catch (e) {
            console.error('Failed to save custom teachers to localStorage:', e);
            alert('Opslaglimiet overschreden of fout bij opslaan van foto.');
        }
    }

    getAllTeachers() {
        return [...this.defaultTeachers, ...this.customTeachers];
    }

    getRandomTeacher() {
        const all = this.getAllTeachers();
        return all[Math.floor(Math.random() * all.length)];
    }

    addCustomTeacher(name, dataUrl) {
        return new Promise((resolve) => {
            const id = 'teacher_' + Date.now();
            const teacher = {
                id: id,
                name: name.trim() || 'Preloaded Docent',
                src: dataUrl,
                isDefault: false
            };
            this.customTeachers.push(teacher);
            this.saveCustomTeachers();
            resolve(teacher);
        });
    }

    removeCustomTeacher(id) {
        this.customTeachers = this.customTeachers.filter(t => t.id !== id);
        this.saveCustomTeachers();
    }
}

window.teacherManager = new TeacherManager();
