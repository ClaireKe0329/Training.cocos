import { Enum } from 'cc';

// Slot Game 使用的 Symbol 種類
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

// 讓 Cocos 可辨識 SymbolType Enum
Enum( SymbolType );

// 提供所有可用的 SymbolType
export const SYMBOL_TYPE_LIST: SymbolType[] = [ SymbolType.A, SymbolType.J, SymbolType.K, SymbolType.Q, SymbolType.M1, SymbolType.M2, SymbolType.M3, SymbolType.M4 ];
