import { SymbolType } from './SymbolType';

// 保存單條中獎 Payline 的連線內容與得分
export interface ILineResultData
{
    // 對應 GameConfig.Paylines 的 zero-based index
    PaylineIndex: number;
    SymbolType: SymbolType;
    MatchCount: number;
    WinningPositions: { ReelIndex: number, RowIndex: number }[];
    Score: number;
}
