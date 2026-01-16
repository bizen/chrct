import { useState, useEffect } from 'react';

const LS_LICENSE_KEY = 'chrct_license_key';
const LS_INSTANCE_ID = 'chrct_instance_id';

export function useLicense() {
    const [isActivated, setIsActivated] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true); // Initial check
    const [isActivating, setIsActivating] = useState<boolean>(false); // Activation action
    const [error, setError] = useState<string | null>(null);

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
                // Use validate endpoint to check status without incrementing instance count
                // (unless we need to re-activate)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        license_key: key,
                        instance_id: instanceId || undefined
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await response.json();

                if (data.valid && data.license_key.status !== 'expired') {
                    setIsActivated(true);
                } else {
                    // If invalid or expired
                    setIsActivated(false);
                    // Optional: Clear storage if definitively invalid
                    // localStorage.removeItem(LS_LICENSE_KEY);
                    // localStorage.removeItem(LS_INSTANCE_ID);
                }
            } catch (err) {
                console.error("License validation failed", err);
                // If network error, we might want to allow access if previously valid?
                // For strict locking, we set false. Given user requirements of "purchase ... to proceed", strict is safe default.
                setIsActivated(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkLicense();
    }, []);

    const activateLicense = async (key: string) => {
        setIsActivating(true);
        setError(null);
        try {
            const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    license_key: key,
                    instance_name: 'chrct-web'
                })
            });

            const data = await response.json();

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
            setError('Connection failed. Please check your internet.');
            return false;
        } finally {
            setIsActivating(false);
        }
    };

    return { isActivated, isChecking, isActivating, activateLicense, error };
}
