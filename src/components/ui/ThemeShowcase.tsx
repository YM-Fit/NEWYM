import { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Select } from './Select';
import { Checkbox } from './Checkbox';
import { Radio } from './Radio';
import { Pagination } from './Pagination';
import { LoadingSpinner } from './LoadingSpinner';
import { Modal } from './Modal';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeShowcase() {
  const { theme, toggleTheme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base text-foreground p-8 space-y-10" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Theme Showcase</h1>
          <p className="text-muted mt-2">סקירה מהירה של קומפוננטות וטוקנים</p>
        </div>
        <Button variant="secondary" onClick={toggleTheme}>
          החלף מצב ({theme === 'dark' ? 'כהה' : 'בהיר'})
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold mb-4">צבעים ראשיים</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-primary" />
              <span>Primary</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-success" />
              <span>Success</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-warning" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-danger" />
              <span>Danger</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-info" />
              <span>Info</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-surface" />
              <span>Surface</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">טיפוגרפיה</h2>
          <p className="text-foreground">טקסט ראשי</p>
          <p className="text-secondary">טקסט משני</p>
          <p className="text-muted">טקסט מושתק</p>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold mb-4">כפתורים</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">שדות וטפסים</h2>
          <div className="space-y-4">
            <Input label="שם מלא" placeholder="ישראל ישראלי" />
            <Input label="אימייל" type="email" success hint="הכתובת תקינה" />
            <Input label="סיסמה" type="password" error="סיסמה חלשה" showPasswordToggle />
            <Select
              label="בחירה"
              options={[
                { value: 'a', label: 'אפשרות א' },
                { value: 'b', label: 'אפשרות ב' },
              ]}
            />
            <div className="flex gap-4">
              <Checkbox label="מאשר/ת תנאים" />
              <Radio label="בחירה יחידה" value="one" checked onChange={() => {}} />
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold mb-4">כרטיסים</h2>
          <div className="grid gap-3">
            <Card variant="default" padding="sm">Default</Card>
            <Card variant="bordered" padding="sm">Bordered</Card>
            <Card variant="glass" padding="sm">Glass</Card>
            <Card variant="premium" padding="sm">Premium</Card>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">רכיבי עזר</h2>
          <div className="flex items-center gap-4">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" variant="dots" />
            <LoadingSpinner size="md" variant="ring" />
            <LoadingSpinner size="md" variant="bars" />
          </div>
          <div className="mt-6">
            <Pagination currentPage={1} totalPages={12} onPageChange={() => {}} />
          </div>
        </Card>
      </section>

      <section className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          הצג מודאל
        </Button>
      </section>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Modal Example">
        <p className="text-secondary">בדיקת קומפוננטת מודאל במצב {theme}.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            סגור
          </Button>
          <Button>אישור</Button>
        </div>
      </Modal>
    </div>
  );
}
