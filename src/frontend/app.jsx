import React from 'react';
import { useWix } from '@wix/sdk-react';
import ConfigPanel from './compoents/ConfigPanel';
import Checkout from './compoents/checkout';


export default function App() {
    const { wix, settings, setSettings } = useWix();

    const isConfigMode = wix.context.mode === 'configure';

    return (
        <div className="app">
            {isConfigMode ? (
                <ConfigPanel settings={settings} setSettings={setSettings} />
            ) : (
                <Checkout 
                    paymentId= {wix.context.paymentId} 
                    amount= {wix.context.amount}
                    currency= {wix.context.currency} 
                    />
            )}
        </div>
    )
}