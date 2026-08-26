import { SymbolType } from './SymbolType';

// 單條 Payline 支援的中獎連線數量
export type WinMatchCount = 3 | 4 | 5;

// 提供中獎判斷與倍率設定共用的連線數規則
export const WIN_MATCH_COUNTS: WinMatchCount[] = [ 3, 4, 5 ];
export const MIN_WIN_MATCH_COUNT: WinMatchCount = Math.min( ...WIN_MATCH_COUNTS ) as WinMatchCount;

// 定義單一 Symbol 在不同連線數量下的得分倍率
export interface ISymbolMultiplier
{
    SymbolType: SymbolType;
    Multipliers: Record<WinMatchCount, number>;
}
