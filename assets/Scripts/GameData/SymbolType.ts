import { Enum } from 'cc';

export enum SymbolType
{
    A,
    J,
    K,
    Q,
    M1,
    M2,
    M3,
    M4,
}

Enum( SymbolType );

export const SYMBOL_TYPE_LIST: SymbolType[] = [ SymbolType.A, SymbolType.J, SymbolType.K, SymbolType.Q, SymbolType.M1, SymbolType.M2, SymbolType.M3, SymbolType.M4 ];
