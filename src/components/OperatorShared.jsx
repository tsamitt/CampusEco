
import { useState, useEffect, useCallback } from "react";
import { loadSignedInOperator } from "../Api/operatorApi.js";

export function useSignedInOperator() {
    const [state, setState] = useState({
        loading: true,
        operator: null,
        error: ""
    });

    const reload = useCallback(async () => {
        try {
            const operator = await loadSignedInOperator();

            setState({
                loading: false,
                operator,
                error: ""
            });

            return operator;
        } catch (err) {
            setState({
                loading: false,
                operator: null,
                error: err.message
            });

            return null;
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return {
        ...state,
        reload
    };
}
