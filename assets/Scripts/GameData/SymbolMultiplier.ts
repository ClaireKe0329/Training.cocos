import { SymbolType } from './SymbolType';

// 定義單一 Symbol 在不同連線數量下的得分倍率
export interface ISymbolMultiplier
{
    // 此倍率設定所屬的 Symbol
    SymbolType: SymbolType;

    // Key 為連線數量，Value 為對應得分倍率
    Multipliers: Record<number, number>;
}
