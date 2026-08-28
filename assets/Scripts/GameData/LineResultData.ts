import { SymbolType } from './SymbolType';

// 保存單條中獎 Payline 的連線內容與得分
export interface ILineResultData
{
    // 對應 GameConfig.Paylines 的 zero-based index
    PaylineIndex: number;

    // 本條 Payline 連續中獎的 Symbol
    SymbolType: SymbolType;

    // 從第一軸開始連續相同 Symbol 的數量
    MatchCount: number;

    // 本條 Payline 實際中獎的盤面位置
    WinningPositions: { ReelIndex: number, RowIndex: number }[];

    // ScoreCalculator 計算完成後的本條 Payline 得分
    Score: number;
}
