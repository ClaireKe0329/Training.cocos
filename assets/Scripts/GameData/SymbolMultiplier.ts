import { SymbolType } from './SymbolType';

// 定義單一 Symbol 在不同連線數量下的得分倍率
export interface ISymbolMultiplier
{
    SymbolType: SymbolType;
    Multipliers: Record<number, number>;
}
