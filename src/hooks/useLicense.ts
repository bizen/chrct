import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

const LS_LICENSE_KEY = 'chrct_license_key';
const LS_INSTANCE_ID = 'chrct_instance_id';

export function useLicense() {
    const [isActivated, setIsActivated] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true); // Initial check
    const [isActivating, setIsActivating] = useState<boolean>(false); // Activation action
    const [error, setError] = useState<string | null>(null);

    const activateAction = useAction(api.license.activate);
    const validateAction = useAction(api.license.validate);

    useEffect(() => {
        const checkLicense = async () => {
            const key = localStorage.getItem(LS_LICENSE_KEY);
            const instanceId = localStorage.getItem(LS_INSTANCE_ID);

            if (!key) {
                setIsActivated(false);
                setIsChecking(false);
                return;
            }

            try {
                // Use validate action via Convex to avoid CORS
                const result = await validateAction({
                    key,
                    instanceId: instanceId || undefined
                });

                if (result.success && result.data.valid && result.data.license_key.status !== 'expired') {
                    setIsActivated(true);
                } else {
                    // If invalid or expired
                    setIsActivated(false);
                }
            } catch (err) {
                console.error("License validation failed", err);
                setIsActivated(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkLicense();
    }, []); // actions are stable

    const activateLicense = async (key: string) => {
        setIsActivating(true);
        setError(null);
        try {
            const result = await activateAction({
                key,
                instanceName: 'chrct-web'
            });

            if (!result.success) {
                console.error("Activation failed:", result.error);
                setError(typeof result.error === 'string' ? result.error : 'Activation failed');
                setIsActivated(false);
                return false;
            }

            const data = result.data;

            if (data.activated && data.license_key.status !== 'expired') {
                setIsActivated(true);
                localStorage.setItem(LS_LICENSE_KEY, key);
                localStorage.setItem(LS_INSTANCE_ID, data.instance.id.toString());
                return true;
            } else {
                setError(data.error || 'Licence key is invalid or expired.');
                setIsActivated(false);
                return false;
            }
        } catch (err) {
            console.error("Activation error:", err);
            setError(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        } finally {
            setIsActivating(false);
        }
    };

    return { isActivated, isChecking, isActivating, activateLicense, error };
}
